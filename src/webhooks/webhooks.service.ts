import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { format, sub } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';
import { MailchimpClient } from 'src/api/mailchimp/mailchip-api';
import { getBookingsForDate } from 'src/api/simplybook/simplybook-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { ZapierSimplybookBodyDto } from 'src/partner-access/dtos/zapier-body.dto';
import { IUser } from 'src/user/user.interface';
import { serializeZapierSimplyBookDtoToTherapySessionEntity } from 'src/utils/serialize';
import { getYesterdaysDate } from 'src/utils/utils';
import { WebhookCreateEventLogDto } from 'src/webhooks/dto/webhook-create-event-log.dto';
import StoryblokClient from 'storyblok-js-client';
import { Between, ILike } from 'typeorm';
import { getCrispPeopleData, updateCrispProfileData } from '../api/crisp/crisp-api';
import { CoursePartnerService } from '../course-partner/course-partner.service';
import { CourseRepository } from '../course/course.repository';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { SessionRepository } from '../session/session.repository';
import { UserRepository } from '../user/user.repository';
import {
  CAMPAIGN_TYPE,
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_STORY_STATUS_ENUM,
  isProduction,
  storyblokToken,
} from '../utils/constants';
import { StoryDto } from './dto/story.dto';
import { EmailCampaignRepository } from './email-campaign/email-campaign.repository';
import { TherapySessionRepository } from './therapy-session.repository';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('WebhookService');

  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    @InjectRepository(CourseRepository) private courseRepository: CourseRepository,
    @InjectRepository(SessionRepository) private sessionRepository: SessionRepository,
    private readonly coursePartnerService: CoursePartnerService,
    @InjectRepository(TherapySessionRepository)
    private therapySessionRepository: TherapySessionRepository,
    @InjectRepository(EmailCampaignRepository)
    private emailCampaignRepository: EmailCampaignRepository,
    private eventLoggerService: EventLoggerService,
    private mailchimpClient: MailchimpClient,
    private slackMessageClient: SlackMessageClient,
  ) {}

  async sendFirstTherapySessionFeedbackEmail() {
    const yesterday = getYesterdaysDate();
    const bookings = await getBookingsForDate(yesterday);

    let feedbackEmailsSent = 0;
    for (const booking of bookings) {
      if (await this.isFirstCampaignEmail(booking.clientEmail, CAMPAIGN_TYPE.THERAPY_FEEDBACK)) {
        let therapySession: TherapySessionEntity;

        try {
          therapySession = await this.therapySessionRepository.findOneOrFail({
            where: {
              bookingCode: booking.bookingCode,
            },
            relations: { user: true },
          });
        } catch (err) {
          this.logger.error(
            `sendFirstTherapySessionFeedbackEmail: failed to check therapySession due to error - ${err}`,
          );
          const emailLog = `Failed to send therapy feedback email due to no associated booking in the database. This user may have used a different email to make the booking or may not have therapy access. [email: ${
            booking.clientEmail
          }, session date: ${format(yesterday, 'dd/MM/yyy')}]`;
          this.slackMessageClient.sendMessageToTherapySlackChannel(emailLog);
          continue;
        }

        if (therapySession.user && therapySession.user.signUpLanguage !== 'en') {
          const emailLog = `Therapy session feedback email not sent as user was not english [email: ${
            booking.clientEmail
          }, session date: ${format(sub(new Date(), { days: 1 }), 'dd/MM/yyyy')}]`;
          this.logger.log(emailLog);
          this.slackMessageClient.sendMessageToTherapySlackChannel(emailLog);
          continue;
        }

        if (therapySession.user && therapySession.user.serviceEmailsPermission === false) {
          const emailLog = `Therapy session feedback email not sent as user has disabled service emails [email: ${
            booking.clientEmail
          }, session date: ${format(sub(new Date(), { days: 1 }), 'dd/MM/yyyy')}]`;
          this.logger.log(emailLog);
          this.slackMessageClient.sendMessageToTherapySlackChannel(emailLog);
          continue;
        }

        await this.mailchimpClient.sendTherapyFeedbackEmail(booking.clientEmail);
        const emailLog = `First therapy session feedback email sent [email: ${
          booking.clientEmail
        }, session date: ${format(yesterday, 'dd/MM/yyy')}]`;
        this.logger.log(emailLog);
        this.slackMessageClient.sendMessageToTherapySlackChannel(emailLog);

        await this.emailCampaignRepository.save({
          campaignType: CAMPAIGN_TYPE.THERAPY_FEEDBACK,
          email: booking.clientEmail,
          emailSentDateTime: new Date(),
        });

        this.logger.log(
          `First therapy session feedback email saved in db [email: ${
            booking.clientEmail
          }, session date: ${format(yesterday, 'dd/MM/yyy')}]`,
        );
        feedbackEmailsSent++;
      }
    }
    return `First therapy session feedback emails sent to ${feedbackEmailsSent} client(s) for date: ${format(
      sub(new Date(), { days: 1 }),
      'dd/MM/yyyy',
    )}`;
  }

  private async isFirstCampaignEmail(email: string, campaign: CAMPAIGN_TYPE) {
    const matchingEntries = await this.emailCampaignRepository.findBy({
      email: ILike(email),
      campaignType: ILike(campaign),
    });
    return matchingEntries.length === 0;
  }

  async sendImpactMeasurementEmail() {
    // Get all users created between 180 and 174 days
    const startDate = sub(startOfDay(new Date()), { days: 180 });
    const endDate = sub(startOfDay(new Date()), { days: 173 });
    let users = null;
    try {
      // Get user from database who made an account between 180 and 173 days ago
      users = await this.userRepository.findBy({
        createdAt: Between(startDate, endDate),
      });
      this.logger.log(
        `SendImpactMeasurementEmail - Successfully fetched ${users.length} from the database`,
      );
    } catch (err) {
      this.logger.error('SendImpactMeasurementEmail - Unable to fetch users due to error', err);
      throw new HttpException(
        'SendImpactMeasurementEmail - Unable to fetch users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // For each user, send an email asking them about impact
    let feedbackEmailsSent = 0;
    for (const user of users) {
      try {
        // Check if this is the first email send of this type
        const isFirstEmail = await this.isFirstCampaignEmail(
          user.email,
          CAMPAIGN_TYPE.IMPACT_MEASUREMENT,
        );
        if (!isFirstEmail) {
          // Send a warning as we shouldn't be getting into this situations
          this.logger.warn(
            `sendImpactMeasurementEmail: Skipping sending user Impact Measurement Email [email: ${user.email}]`,
          );
          continue;
        }
        if (user.serviceEmailsPermission === false) {
          this.logger.log(
            `sendImpactMeasurementEmail: Skipped sending user Impact Measurement Email - user has disabled service emails  [email: ${user.email}]`,
          );
          continue;
        }
      } catch (err) {
        this.logger.error(
          `sendImpactMeasurementEmail: Failed to find user in emailCampaignRepository [email: ${user.email}]`,
        );
        continue;
      }

      try {
        await this.mailchimpClient.sendImpactMeasurementEmail(user.email);
        this.logger.log(`Impact measurement feedback email sent to [email: ${user.email}]`);
        feedbackEmailsSent++;
      } catch (err) {
        this.logger.error(
          `Failed to send Impact measurement feedback email to [email: ${user.email}]`,
        );
        continue;
      }
      try {
        await this.emailCampaignRepository.save({
          campaignType: CAMPAIGN_TYPE.IMPACT_MEASUREMENT,
          email: user.email,
          emailSentDateTime: new Date(),
        });
        this.logger.log(`Impact measurement feedback email saved in db [email: ${user.email}]`);
      } catch (err) {
        this.logger.error(
          `Failed to save Impact measurement feedback email in Email Campaign Repository to [email: ${user.email}]: ${err}`,
        );
      }
    }

    const emailLog = `Impact feedback email sent to ${feedbackEmailsSent} users who created their account between ${format(
      startDate,
      'dd/MM/yyyy',
    )} - ${format(endDate, 'dd/MM/yyyy')}`;
    this.logger.log(emailLog);
    return emailLog;
  }

  renameKeys = (obj: { [x: string]: any }) => {
    const keyValues = Object.keys(obj).map((key) => {
      const newKey = this.addUnderscore(key);
      return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...keyValues);
  };

  addUnderscore = (title: string) => {
    return title
      .split(/(?=[A-Z])/)
      .join('_')
      .toLowerCase();
  };

  async updateCrispProfileTherapyData(action, email) {
    let partnerAccessUpdateCrisp = {};
    const crispResponse = await getCrispPeopleData(email);
    const crispData = crispResponse.data.data.data;

    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING) {
      partnerAccessUpdateCrisp = {
        therapy_sessions_remaining: crispData['therapy_sessions_remaining'] - 1,
        therapy_sessions_redeemed: crispData['therapy_sessions_redeemed'] + 1,
      };
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) {
      partnerAccessUpdateCrisp = {
        therapy_sessions_remaining: crispData['therapy_sessions_remaining'] + 1,
        therapy_sessions_redeemed: crispData['therapy_sessions_redeemed'] - 1,
      };
    }

    updateCrispProfileData(partnerAccessUpdateCrisp, email);
  }

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

    this.updateCrispProfileTherapyData(action, user.email);

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

    if (action === SIMPLYBOOK_ACTION_ENUM.COMPLETED_BOOKING) {
      existingTherapySession.completedAt = new Date();
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING) {
      existingTherapySession.rescheduledFrom = existingTherapySession.startDateTime;
      existingTherapySession.startDateTime = new Date(simplyBookDto.start_date_time);
      existingTherapySession.endDateTime = new Date(simplyBookDto.end_date_time);
    }

    try {
      const therapySession = await this.therapySessionRepository.save(existingTherapySession);
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
      const error = `UpdatePartnerAccessTherapy - error finding user with userID ${userId} and origin client_email ${client_email}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async newPartnerAccessTherapy(user: IUser, simplyBookDto: ZapierSimplybookBodyDto) {
    const partnerAccesses = await this.partnerAccessRepository.findBy({
      userId: user.id,
      active: true,
      featureTherapy: true,
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
      .sort((a: any, b: any) => {
        return a.createdAt - b.createdAt;
      })[0];

    if (!partnerAccess) {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `User booked therapy with no therapy sessions remaining, please email user ${user.email} to confirm the booking has not been made`,
      );
      const error = `newPartnerAccessTherapy - user has partner therapy access but has 0 therapy sessions remaining - email ${user.email} userId ${user.id}`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.FORBIDDEN);
    }

    this.updateCrispProfileTherapyData(SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING, user.email);

    partnerAccess.therapySessionsRemaining -= 1;
    partnerAccess.therapySessionsRedeemed += 1;

    try {
      const serializedTherapySession = serializeZapierSimplyBookDtoToTherapySessionEntity(
        simplyBookDto,
        partnerAccess,
      );
      await this.partnerAccessRepository.save(partnerAccess);
      return await this.therapySessionRepository.save(serializedTherapySession);
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
        let course = await this.courseRepository.findOneBy({
          storyblokId: story_id,
        });

        if (!!course) {
          course.status = action;
          course.slug = story.full_slug;
        } else {
          course = this.courseRepository.create(storyData);
        }
        course.name = story.content?.name;
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

        const newSession = !!session
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

  async updateStory(data: StoryDto, signature: string | undefined) {
    // Verify storyblok signature uses storyblok webhook secret - see https://www.storyblok.com/docs/guide/in-depth/webhooks#securing-a-webhook
    if (!signature) {
      const error = `Storyblok webhook error - no signature provided`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }

    const webhookSecret = process.env.STORYBLOK_WEBHOOK_SECRET;
    const bodyHmac = createHmac('sha1', webhookSecret).update(JSON.stringify(data)).digest('hex');

    if (bodyHmac !== signature) {
      const error = `Storyblok webhook error - signature mismatch`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }

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

    if (!!course) {
      course.status = action;
      course = await this.courseRepository.save(course);
      this.logger.log(`Storyblok course ${action} success - ${course.name}`);
      return course;
    } else if (!course) {
      // No course found, try finding session instead
      let session = await this.sessionRepository.findOneBy({
        storyblokId: story_id,
      });

      if (!!session) {
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

    try {
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
    } catch (err) {
      throw err;
    }
  }
}
