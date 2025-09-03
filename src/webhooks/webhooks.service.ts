import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { apiPlugin, ISbStoryData, storyblokInit } from '@storyblok/js';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CourseEntity } from 'src/entities/course.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ZapierSimplybookBodyDto } from 'src/partner-access/dtos/zapier-body.dto';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { IUser } from 'src/user/user.interface';
import { serializeZapierSimplyBookDtoToTherapySessionEntity } from 'src/utils/serialize';
import { ILike, MoreThan, Repository } from 'typeorm';
import { CoursePartnerService } from '../course-partner/course-partner.service';
import {
  isProduction,
  RESOURCE_CATEGORIES,
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_PAGE_COMPONENTS,
  STORYBLOK_STORY_STATUS_ENUM,
  storyblokToken,
} from '../utils/constants';
import { StoryWebhookDto } from './dto/story.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('WebhookService');

  constructor(
    @InjectRepository(PartnerAccessEntity)
    private partnerAccessRepository: Repository<PartnerAccessEntity>,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity) private courseRepository: Repository<CourseEntity>,
    @InjectRepository(SessionEntity) private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(ResourceEntity) private resourceRepository: Repository<ResourceEntity>,
    private readonly coursePartnerService: CoursePartnerService,
    @InjectRepository(TherapySessionEntity)
    private therapySessionRepository: Repository<TherapySessionEntity>,
    private serviceUserProfilesService: ServiceUserProfilesService,
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

      this.serviceUserProfilesService.updateServiceUserProfilesTherapy(partnerAccesses, user.email);

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
      this.serviceUserProfilesService.updateServiceUserProfilesTherapy(
        updatedPartnerAccesses,
        user.email,
      );
      return therapySession;
    } catch (err) {
      const error = `newPartnerAccessTherapy - error saving new therapy session and partner access - email ${user.email} userId ${user.id} - ${err}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async updateOrCreateStoryData(
    storyData: ISbStoryData,
    status: STORYBLOK_STORY_STATUS_ENUM,
  ) {
    const storyPageComponent = storyData.content.component as STORYBLOK_PAGE_COMPONENTS;

    const updatedStoryData = {
      name: storyData.content.name,
      slug: storyData.full_slug,
      status: status,
    }; // fields to update on existing and new stories

    const newStoryData = {
      storyblokId: storyData.id,
      storyblokUuid: storyData.uuid,
      ...updatedStoryData,
    }; // includes storyblok id and uuid for new stories only

    try {
      if (
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_SHORT_VIDEO ||
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_CONVERSATION ||
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_SINGLE_VIDEO
      ) {
        const resourceCategory =
          storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_SHORT_VIDEO
            ? RESOURCE_CATEGORIES.SHORT_VIDEO
            : storyPageComponent === STORYBLOK_PAGE_COMPONENTS.RESOURCE_SINGLE_VIDEO
              ? RESOURCE_CATEGORIES.SINGLE_VIDEO
              : RESOURCE_CATEGORIES.CONVERSATION;

        const existingResource = await this.resourceRepository.findOneBy({
          storyblokUuid: storyData.uuid,
        });
        const data = existingResource
          ? { ...existingResource, ...updatedStoryData }
          : { ...newStoryData, category: resourceCategory };

        const resource = await this.resourceRepository.save(data);
        this.logger.log(`Storyblok resource ${status} success - ${resource.name}`);
        return resource;
      }

      if (storyPageComponent === STORYBLOK_PAGE_COMPONENTS.COURSE) {
        const existingCourse = await this.courseRepository.findOneBy({
          storyblokUuid: storyData.uuid,
        });
        const data = existingCourse
          ? { ...existingCourse, ...updatedStoryData }
          : { ...newStoryData };

        const course = await this.courseRepository.save(data);

        if (!existingCourse)
          // new course, add mailchimp course field
          this.serviceUserProfilesService.createMailchimpCourseMergeField(updatedStoryData.name);

        await this.coursePartnerService.updateCoursePartners(
          storyData.content?.included_for_partners,
          course.id,
        );
        this.logger.log(`Storyblok course ${status} success - ${course.name}`);
        return course;
      }

      if (
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.SESSION ||
        storyPageComponent === STORYBLOK_PAGE_COMPONENTS.SESSION_IBA
      ) {
        const course = await this.courseRepository.findOneByOrFail({
          storyblokUuid: storyData.content.course,
        });

        const existingSession = await this.sessionRepository.findOneBy({
          storyblokUuid: storyData.uuid,
        });
        const data = existingSession
          ? { ...existingSession, ...updatedStoryData, courseId: course.id }
          : { ...newStoryData, courseId: course.id };

        const session = await this.sessionRepository.save(data);
        this.logger.log(`Storyblok session ${status} success - ${session.name}`);
        return session;
      }
      return undefined; // Story wasn't a course, session or resource story. No sync or updates completed
    } catch (err) {
      const error = `Storyblok webhook failed - error updating or creating ${status} ${storyPageComponent} story record ${storyData.uuid} - ${err}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateInactiveStoryStatus(storyblokUuid: string, status: STORYBLOK_STORY_STATUS_ENUM) {
    // Story is deleted so cant be fetched from storyblok to get story type
    // Try to find course with matching story_id first
    let course = await this.courseRepository.findOneBy({
      storyblokUuid,
    });

    if (course) {
      course = await this.courseRepository.save({ ...course, status });
      this.logger.log(`Storyblok course ${status} success - ${course.name}`);
      return course;
    }
    // No course found, try finding session instead
    let session = await this.sessionRepository.findOneBy({
      storyblokUuid,
    });

    if (session) {
      session = await this.sessionRepository.save({ ...session, status });
      this.logger.log(`Storyblok session ${status} success - ${session.name}`);
      return session;
    }

    // No session found, try finding resource instead
    let resource = await this.resourceRepository.findOneBy({
      storyblokUuid,
    });

    if (resource) {
      resource = await this.resourceRepository.save({ ...resource, status });
      this.logger.log(`Storyblok session ${status} success - ${resource.name}`);
      return resource;
    }
  }

  // Handle Storyblok story status change (published, unpublished, moved, deleted)
  // Triggered by a webhook, this function handles updating our database records to sync with storyblok story data
  async handleStoryUpdated(data: StoryWebhookDto) {
    const status = data.action;
    const story_id = data.story_id;

    this.logger.log(`Storyblok story ${status} request - ${story_id}`);

    // Story was either published or moved
    // Retrieve the story data from storyblok before handling the update/create
    let story: ISbStoryData;

    if (!storyblokToken) {
      const error = `Storyblok webhook failed - missing storyblok token`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { storyblokApi } = storyblokInit({
      accessToken: storyblokToken,
      apiOptions: {
        region: 'eu',
      },
      use: [apiPlugin],
    });

    try {
      const response = await storyblokApi.get(`cdn/stories/${story_id}`);
      if (response?.data?.story) {
        story = response.data.story as ISbStoryData;
      }
    } catch (err) {
      const error = `Storyblok webhook failed - error getting story from storyblok - ${JSON.stringify(err)}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!story || !story.uuid) {
      const error = `Storyblok webhook failed - missing story or uuid in response for story ID ${story_id}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }

    const storyblokUuid = story.uuid;
    if (
      status === STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED ||
      status === STORYBLOK_STORY_STATUS_ENUM.DELETED
    ) {
      // Story can't be retrieved from storyblok so we just update the status of existing records
      return this.updateInactiveStoryStatus(storyblokUuid, status);
    }

    // Create or update the resource/course/session record in our database
    return this.updateOrCreateStoryData(story, status);
  }
}
