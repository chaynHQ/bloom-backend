import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CourseEntity } from 'src/entities/course.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { ZapierSimplybookBodyDto } from 'src/partner-access/dtos/zapier-body.dto';
import { IUser } from 'src/user/user.interface';
import { serializeZapierSimplyBookDtoToTherapySessionEntity } from 'src/utils/serialize';
import {
  createMailchimpCourseMergeField,
  updateServiceUserProfilesTherapy,
} from 'src/utils/serviceUserProfiles';
import { WebhookCreateEventLogDto } from 'src/webhooks/dto/webhook-create-event-log.dto';
import StoryblokClient from 'storyblok-js-client';
import { ILike, MoreThan, Repository } from 'typeorm';
import { CoursePartnerService } from '../course-partner/course-partner.service';
import {
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_STORY_STATUS_ENUM,
  isProduction,
  storyblokToken,
} from '../utils/constants';
import { StoryDto } from './dto/story.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('WebhookService');

  constructor(
    @InjectRepository(PartnerAccessEntity)
    private partnerAccessRepository: Repository<PartnerAccessEntity>,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity) private courseRepository: Repository<CourseEntity>,
    @InjectRepository(SessionEntity) private sessionRepository: Repository<SessionEntity>,
    private readonly coursePartnerService: CoursePartnerService,
    @InjectRepository(TherapySessionEntity)
    private therapySessionRepository: Repository<TherapySessionEntity>,
    private eventLoggerService: EventLoggerService,
    private slackMessageClient: SlackMessageClient,
  ) {}

  async updatePartnerAccessTherapy(
    simplyBookDto: ZapierSimplybookBodyDto,
  ): Promise<TherapySessionEntity> {
    const { action, booking_code, user_id, client_email } = simplyBookDto;

    this.logger.log(
      `Update therapy session webhook function STARTED for ${action} - ${client_email} - ${booking_code} - userId ${user_id}`,
    );

    // Retrieve existing therapy session record for this booking
    const existingTherapySession = await this.therapySessionRepository.findOneBy({
      clientEmail: ILike(client_email),
      bookingCode: ILike(booking_code),
    });

    if (action !== SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING && !existingTherapySession) {
      const error = `UpdatePartnerAccessTherapy - existing therapy session not found for user ${client_email} booking code ${booking_code}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING && existingTherapySession && isProduction) {
      const error = `UpdatePartnerAccessTherapy - therapy session already exists for ${client_email} booking code ${booking_code}, preventing duplicate NEW_BOOKING action`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.FOUND);
    }

    const userId = user_id || existingTherapySession?.userId;
    const user = await this.getSimplyBookTherapyUser(userId, client_email);

    // Creating a new therapy session
    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING) {
      const therapySession = await this.newPartnerAccessTherapy(user, simplyBookDto);

      this.logger.log(
        `Update therapy session webhook function COMPLETED for ${action} - ${user.email} - ${booking_code} - userId ${user_id}`,
      );
      return therapySession;
    }

    // Updating an existing therapy session
    existingTherapySession.action = action;

    // If the booking is cancelled, increment the therapy sessions remaining on related partner access
    if (action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) {
      try {
        const partnerAccess = await this.partnerAccessRepository.findOneBy({
          id: existingTherapySession.partnerAccessId,
        });

        partnerAccess.therapySessionsRemaining += 1;
        partnerAccess.therapySessionsRedeemed -= 1;

        await this.partnerAccessRepository.save(partnerAccess);

        existingTherapySession.cancelledAt = new Date();
      } catch (err) {
        const error = `UpdatePartnerAccessTherapy - error updating partner access for ${action} - email ${user.email} userId ${user.id} - ${err}`;
        this.logger.error(error);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING) {
      existingTherapySession.rescheduledFrom = existingTherapySession.startDateTime;
      existingTherapySession.startDateTime = new Date(simplyBookDto.start_date_time);
      existingTherapySession.endDateTime = new Date(simplyBookDto.end_date_time);
    }

    try {
      const therapySession = await this.therapySessionRepository.save(existingTherapySession);

      const partnerAccesses = await this.partnerAccessRepository.find({
        where: {
          userId: user.id,
          active: true,
          featureTherapy: true,
        },
        relations: {
          therapySession: true,
        },
      });

      updateServiceUserProfilesTherapy(partnerAccesses, user.email);

      this.logger.log(
        `Update therapy session webhook function COMPLETED for ${action} - ${user.email} - ${booking_code} - userId ${user_id}`,
      );
      return therapySession;
    } catch (err) {
      const error = `UpdatePartnerAccessTherapy - error updating therapy session for ${action} - email ${user.email} userId ${user.id} - ${err}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async getSimplyBookTherapyUser(userId: string, client_email: string): Promise<IUser> {
    if (!userId) {
      // No userId sent in the webhook - likely due to user clicking simplybook link from email instead of in-app widget
      // Try to find a user associated to this email
      try {
        // Check for previous therapy sessions associated to the email
        const previousTherapySession = await this.therapySessionRepository.findOneBy({
          clientEmail: ILike(client_email),
        });

        if (previousTherapySession?.userId) {
          userId = previousTherapySession.userId;
        } else {
          // No previous therapy sessions, try matching email with user
          const user = await this.userRepository.findOneBy({
            email: ILike(client_email),
          });
          if (user?.id) {
            userId = user.id;
          }
        }
      } catch (err) {
        const error = `UpdatePartnerAccessTherapy - error finding user in therapyRepository or userRepository with email ${client_email} - ${err}`;
        this.logger.error(error);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      if (!userId) {
        // All searches tried and failed, throw 404/400 error
        const error = `UpdatePartnerAccessTherapy - user not found for email ${client_email} and no userId provided or found`;
        this.logger.error(error);
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }
    }

    try {
      // userId available, find and return user record
      const user = await this.userRepository.findOneBy({ id: userId });
      if (user) return user;

      // No user record found for userId, throw error
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `Unknown user made a therapy booking with email ${client_email}, userID ${userId} 🚨`,
      );
      const error = `UpdatePartnerAccessTherapy - user not found for userID ${userId}, with origin client_email ${client_email}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    } catch (err) {
      const error = `UpdatePartnerAccessTherapy - error finding user with userID ${userId} and origin client_email ${client_email} - ${err}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async newPartnerAccessTherapy(user: IUser, simplyBookDto: ZapierSimplybookBodyDto) {
    const partnerAccesses = await this.partnerAccessRepository.find({
      where: {
        userId: user.id,
        active: true,
        featureTherapy: true,
        therapySessionsRemaining: MoreThan(0),
      },
      relations: {
        therapySession: true,
      },
    });

    if (!partnerAccesses.length) {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `User booked therapy with no partner therapy access, please email user ${user.email} to confirm the booking has not been made and fix the account access`,
      );
      const error = `newPartnerAccessTherapy - no partner therapy access - email ${user.email} userId ${user.id}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.FORBIDDEN);
    }

    const partnerAccess = partnerAccesses
      .filter((tpa) => tpa.therapySessionsRemaining > 0)
      .sort(
        (a: PartnerAccessEntity, b: PartnerAccessEntity) =>
          a.createdAt.getTime() - b.createdAt.getTime(),
      )[0];

    if (!partnerAccess) {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `User booked therapy with no therapy sessions remaining, please email user ${user.email} to confirm the booking has not been made`,
      );
      const error = `newPartnerAccessTherapy - user has partner therapy access but has 0 therapy sessions remaining - email ${user.email} userId ${user.id}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.FORBIDDEN);
    }

    partnerAccess.therapySessionsRemaining -= 1;
    partnerAccess.therapySessionsRedeemed += 1;

    try {
      const serializedTherapySession = serializeZapierSimplyBookDtoToTherapySessionEntity(
        simplyBookDto,
        partnerAccess,
      );

      await this.partnerAccessRepository.save(partnerAccess);
      const therapySession = await this.therapySessionRepository.save(serializedTherapySession);

      const updatedPartnerAccesses = await this.partnerAccessRepository.find({
        where: {
          userId: user.id,
          active: true,
          featureTherapy: true,
        },
        relations: {
          therapySession: true,
        },
      });
      updateServiceUserProfilesTherapy(updatedPartnerAccesses, user.email);
      return therapySession;
    } catch (err) {
      const error = `newPartnerAccessTherapy - error saving new therapy session and partner access - email ${user.email} userId ${user.id} - ${err}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async createNewStory(story_id: number, action: STORYBLOK_STORY_STATUS_ENUM) {
    let story;

    const Storyblok = new StoryblokClient({
      accessToken: storyblokToken,
      cache: {
        clear: 'auto',
        type: 'memory',
      },
    });

    try {
      const response = await Storyblok.get(`cdn/stories/${story_id}`);
      if (response?.data?.story) {
        story = response.data.story;
      }
    } catch (err) {
      const error = `Storyblok webhook failed - error getting story from storyblok - ${err}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.NOT_FOUND);
    }

    const storyData = {
      name: story.name,
      slug: story.full_slug,
      status: action,
      storyblokId: story_id,
      storyblokUuid: story.uuid,
    };
    try {
      if (story.content?.component === 'Course') {
        const courseName = story.content?.name;

        let course = await this.courseRepository.findOneBy({
          storyblokId: story_id,
        });

        if (course) {
          course.status = action;
          course.slug = story.full_slug;
        } else {
          course = this.courseRepository.create(storyData);
          createMailchimpCourseMergeField(courseName);
        }

        course.name = courseName;
        course = await this.courseRepository.save(course);

        await this.coursePartnerService.updateCoursePartners(
          story.content?.included_for_partners,
          course.id,
        );

        this.logger.log(`Storyblok course ${action} success - ${course.name}`);
        return course;
      } else if (
        story.content?.component === 'Session' ||
        story.content?.component === 'session_iba'
      ) {
        const course = await this.courseRepository.findOneBy({
          storyblokUuid: story.content.course,
        });

        if (!course.id) {
          const error = `Storyblok webhook failed - course not found for session story`;
          this.logger.error(error);
          throw new HttpException(error, HttpStatus.NOT_FOUND);
        }

        let session = await this.sessionRepository.findOneBy({
          storyblokId: story_id,
        });

        const newSession = session
          ? {
              ...session,
              status: action,
              slug: story.full_slug,
              name: story.name,
              course: course,
              courseId: course.id,
            }
          : this.sessionRepository.create({ ...storyData, ...{ courseId: course.id } });

        session = await this.sessionRepository.save(newSession);
        this.logger.log(`Storyblok session ${action} success - ${session.name}`);
        return session;
      }
      return undefined; // New story wasn't a course or session story, ignore
    } catch (err) {
      const error = `Storyblok webhook failed - error creating new ${story.content?.component} record - ${err}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateStory(data: StoryDto) {
    const action = data.action;
    const story_id = data.story_id;

    this.logger.log(`Storyblok story ${action} request - ${story_id}`);

    if (action === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) {
      return this.createNewStory(story_id, action);
    }

    // Story was unpublished or deleted so cant be fetched from storyblok to get story type (Course or Session)
    // Try to find course with matching story_id first
    let course = await this.courseRepository.findOneBy({
      storyblokId: story_id,
    });

    if (course) {
      course.status = action;
      course = await this.courseRepository.save(course);
      this.logger.log(`Storyblok course ${action} success - ${course.name}`);
      return course;
    } else if (!course) {
      // No course found, try finding session instead
      let session = await this.sessionRepository.findOneBy({
        storyblokId: story_id,
      });

      if (session) {
        session.status = action;
        session = await this.sessionRepository.save(session);
        this.logger.log(`Storyblok session ${action} success - ${session.name}`);
        return session;
      }
    }
  }

  async createEventLog(createEventDto: WebhookCreateEventLogDto): Promise<EventLogEntity> {
    if (!createEventDto.email && !createEventDto.userId) {
      const error = `createEventLog webhook failed - neither user email or userId was provided`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }

    // Only fetch user object if the userId is not provided
    const user = createEventDto.userId
      ? undefined
      : await this.userRepository.findOneBy({ email: ILike(createEventDto.email) });

    if (user || createEventDto.userId) {
      const event = await this.eventLoggerService.createEventLog({
        userId: createEventDto.userId || user.id,
        event: createEventDto.event,
        date: createEventDto.date,
      });
      return event;
    } else {
      const error = `createEventLog webhook failed - no user attached to email ${createEventDto.email}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.NOT_FOUND);
    }
  }
}
