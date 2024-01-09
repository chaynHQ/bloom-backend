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
import { serializeZapierSimplyBookDtoToTherapySessionEntity } from 'src/utils/serialize';
import { getYesterdaysDate } from 'src/utils/utils';
import { WebhookCreateEventLogDto } from 'src/webhooks/dto/webhook-create-event-log.dto';
import StoryblokClient from 'storyblok-js-client';
import { Between } from 'typeorm';
import { getCrispPeopleData, updateCrispProfileData } from '../api/crisp/crisp-api';
import { CoursePartnerService } from '../course-partner/course-partner.service';
import { CourseRepository } from '../course/course.repository';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { SessionRepository } from '../session/session.repository';
import { UserRepository } from '../user/user.repository';
import {
  CAMPAIGN_TYPE,
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_STORY_STATUS_ENUM,
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
        try {
          const therapySession = await this.therapySessionRepository.findOneOrFail(
            {
              bookingCode: booking.bookingCode,
            },
            { relations: ['user'] },
          );

          if (therapySession.user && therapySession.user.signUpLanguage !== 'en') {
            const emailLog = `Therapy session feedback email not sent as user was not english [email: ${
              booking.clientEmail
            }, session date: ${format(sub(new Date(), { days: 1 }), 'dd/MM/yyyy')}]`;
            this.logger.log(emailLog);
            this.slackMessageClient.sendMessageToTherapySlackChannel(emailLog);
            continue;
          }
        } catch (err) {
          this.logger.error(
            `sendFirstTherapySessionFeedbackEmail: failed to check therapySession due to error - ${err}`,
          );
          const emailLog = `Failed to send therapy feedback email due to internal error [email: ${
            booking.clientEmail
          }, session date: ${format(yesterday, 'dd/MM/yyy')}]`;
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
    const matchingEntries = await this.emailCampaignRepository.find({
      email,
      campaignType: campaign,
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
      users = await this.userRepository.find({
        where: {
          createdAt: Between(startDate, endDate),
        },
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

    return 'ok';
  }
  private async createTherapySession(
    simplyBookDto: ZapierSimplybookBodyDto,
    partnerAccess: PartnerAccessEntity,
  ) {
    const therapySession = serializeZapierSimplyBookDtoToTherapySessionEntity(
      simplyBookDto,
      partnerAccess,
    );
    return await this.therapySessionRepository.save(therapySession);
  }

  private async updateTherapySession(
    action,
    simplyBookDto: ZapierSimplybookBodyDto,
    therapySession: TherapySessionEntity,
  ): Promise<TherapySessionEntity> {
    const updatedTherapySession = {
      ...therapySession,
      action,
      ...(action === SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING
        ? {
            rescheduledFrom: therapySession.startDateTime,
            startDateTime: new Date(simplyBookDto.start_date_time),
            endDateTime: new Date(simplyBookDto.end_date_time),
          }
        : {}),
      ...(action === SIMPLYBOOK_ACTION_ENUM.COMPLETED_BOOKING ? { completedAt: new Date() } : {}),
      ...(action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING ? { cancelledAt: new Date() } : {}),
    };

    return await this.therapySessionRepository.save(updatedTherapySession);
  }

  async updatePartnerAccessTherapy(
    simplyBookDto: ZapierSimplybookBodyDto,
  ): Promise<TherapySessionEntity> {
    const { action, booking_code, client_id } = simplyBookDto;

    // this ensures that the client email can be matched against the db which contains lower case emails
    const client_email = simplyBookDto.client_email.toLowerCase();

    this.logger.log(
      `UpdatePartnerAccessService method initiated for ${action} - ${client_email} - ${booking_code} - userId ${simplyBookDto.client_id}`,
    );

    const inferIdFromPreviousTherapySessionOrUser = async () => {
      try {
        const previousTherapySession = await this.therapySessionRepository.findOne({
          clientEmail: client_email,
        });

        // If there are no previous therapy sessions, try matching email with user
        if (!previousTherapySession) {
          const user = await this.userRepository.findOne({ email: client_email });

          return user?.id;
        }

        return previousTherapySession?.userId;
      } catch (err) {
        throw new HttpException(
          `inferIdFromPreviousTherapySessionOrUser - error finding userId from therapyRepository or userRepository ${err}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    };

    // Retrieve therapy session
    const therapySession: TherapySessionEntity | undefined =
      action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING
        ? undefined
        : await this.therapySessionRepository.findOne({
            bookingCode: booking_code,
            clientEmail: client_email,
          });

    const userId: string | undefined =
      client_id || therapySession?.userId || (await inferIdFromPreviousTherapySessionOrUser());

    // ensure user exists and throw error if not
    const userDetails = await this.userRepository.findOne({ id: userId });
    if (!userDetails) {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `Unknown user made a therapy booking - ${client_email}, id: ${userId} 🚨`,
      );
      this.logger.error(
        `UpdatePartnerAccessTherapy, Unable to find user with email ${client_email}, id ${userId}`,
      );
      throw new HttpException(
        `UpdatePartnerAccessTherapy, Unable to find user with email ${client_email}, id ${userId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Handle partner access changes
    const usersPartnerAccesses = await this.partnerAccessRepository.find({
      userId: userDetails.id,
      active: true,
    });

    if (usersPartnerAccesses.length === 0) {
      this.logger.error('Unable to find partner access');
      throw new HttpException('Unable to find partner access', HttpStatus.BAD_REQUEST);
    }
    // Filter all partner accesses and get the ones that have therapy available
    const therapyPartnerAccesses: PartnerAccessEntity[] = usersPartnerAccesses
      .filter((pa) => {
        return pa.featureTherapy === true;
      })
      .sort((a: any, b: any) => {
        return a.createdAt - b.createdAt;
      });

    // throw error if none have therapy enabled
    if (therapyPartnerAccesses.length === 0) {
      this.logger.error('User  has no partner access with therapy available');

      throw new HttpException(
        'User has no partner access with therapy available',
        HttpStatus.FORBIDDEN,
      );
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING) {
      return await this.newPartnerAccessTherapy(therapyPartnerAccesses, simplyBookDto);
    }

    if (!therapySession) {
      throw new HttpException('Therapy session not found', HttpStatus.FORBIDDEN);
    }

    this.updateCrispProfileTherapyData(action, client_email);

    // if it is a cancelled booking, add a therapy session
    if (action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) {
      // Any partner access therapy session will do
      const therapyPartnerAccess = therapyPartnerAccesses[0];
      const partnerAccessUpdateDetails = {
        therapySessionsRemaining: therapyPartnerAccess.therapySessionsRemaining + 1,
        therapySessionsRedeemed: therapyPartnerAccess.therapySessionsRedeemed - 1,
      };
      try {
        await this.partnerAccessRepository.save(
          Object.assign(therapyPartnerAccess, { ...partnerAccessUpdateDetails }),
        );
      } catch (err) {
        throw err;
      }
    }

    try {
      const updatedTherapySession = await this.updateTherapySession(
        action,
        simplyBookDto,
        therapySession,
      );

      return updatedTherapySession;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async newPartnerAccessTherapy(
    partnerAccesses: PartnerAccessEntity[],
    simplyBookDto: ZapierSimplybookBodyDto,
  ) {
    const therapyPartnerAccess = partnerAccesses.filter(
      (tpa) => tpa.therapySessionsRemaining > 0,
    )[0];
    // if it is new booking, therapy sessions must be available
    if (typeof therapyPartnerAccess === 'undefined') {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `User booked therapy with no therapy sessions remaining, please email user ${simplyBookDto.client_email} to confirm the booking has not been made`,
      );
      throw new HttpException('No therapy sessions remaining', HttpStatus.FORBIDDEN);
    }

    this.updateCrispProfileTherapyData(
      SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
      simplyBookDto.client_email,
    );

    // if it is a new booking, deduct a therapy session
    const partnerAccessUpdateDetails = {
      therapySessionsRemaining: therapyPartnerAccess.therapySessionsRemaining - 1,
      therapySessionsRedeemed: therapyPartnerAccess.therapySessionsRedeemed + 1,
    };

    try {
      const therapySession = await this.createTherapySession(simplyBookDto, therapyPartnerAccess);

      await this.partnerAccessRepository.save(
        Object.assign(therapyPartnerAccess, { ...partnerAccessUpdateDetails }),
      );

      return therapySession;
    } catch (error) {
      throw error;
    }
  }

  async updateStory(data: StoryDto, signature: string | undefined) {
    // Verify storyblok signature uses storyblok webhook secret - see https://www.storyblok.com/docs/guide/in-depth/webhooks#securing-a-webhook
    if (!signature) {
      throw new HttpException(
        'Storyblok webhook failed: no signature provided',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const webhookSecret = process.env.STORYBLOK_WEBHOOK_SECRET;
    const bodyHmac = createHmac('sha1', webhookSecret).update(JSON.stringify(data)).digest('hex');

    if (bodyHmac !== signature) {
      throw new HttpException(
        'Storyblok webhook failed: signature mismatch',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const action = data.action;
    const story_id = data.story_id;

    this.logger.log(`Storyblok story ${action} request - ${story_id}`);

    if (action === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) {
      let story;

      const Storyblok = new StoryblokClient({
        accessToken: storyblokToken,
        cache: {
          clear: 'auto',
          type: 'memory',
        },
      });

      try {
        const {
          data: { story: storyblokData },
        } = await Storyblok.get(`cdn/stories/${story_id}`);
        story = storyblokData;
      } catch (error) {
        throw new HttpException(error, HttpStatus.NOT_FOUND);
      }

      if (!story) {
        throw new HttpException('STORY NOT FOUND', HttpStatus.NOT_FOUND);
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
          let course = await this.courseRepository.findOne({
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
          const course = await this.courseRepository.findOne({
            storyblokUuid: story.content.course,
          });

          if (!course.id) {
            throw new HttpException('COURSE NOT FOUND', HttpStatus.NOT_FOUND);
          }

          let session = await this.sessionRepository.findOne({
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
      } catch (error) {
        throw error;
      }
    } else if (
      action === STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED ||
      action === STORYBLOK_STORY_STATUS_ENUM.DELETED
    ) {
      // Story was unpublished or deleted so cant be fetched to check story type (Course or Session)
      // Try to find course with matching story_id first
      let course = await this.courseRepository.findOne({
        storyblokId: story_id,
      });

      if (!!course) {
        course.status = action;
        course = await this.courseRepository.save(course);
        this.logger.log(`Storyblok course ${action} success - ${course.name}`);
        return course;
      } else if (!course) {
        // No course found, try finding session instead
        let session = await this.sessionRepository.findOne({
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
  }

  async createEventLog(createEventDto: WebhookCreateEventLogDto): Promise<EventLogEntity> {
    if (!createEventDto.email && !createEventDto.userId) {
      throw new HttpException(
        'webhooks.createEventLog - Neither User email or userId was provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Only fetch user object if strictly necessary
      const user = createEventDto.userId
        ? undefined
        : await this.userRepository.findOne({ email: createEventDto.email });

      if (user || createEventDto.userId) {
        const event = await this.eventLoggerService.createEventLog({
          userId: createEventDto.userId || user.id,
          event: createEventDto.event,
          date: createEventDto.date,
        });
        return event;
      } else {
        throw new HttpException(
          `webhooksService.createEventLog error, no user attached to email ${createEventDto.email}`,
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (err) {
      throw err;
    }
  }
}
