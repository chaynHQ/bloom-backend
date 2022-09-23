import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { MailchimpClient } from 'src/api/mailchimp/mailchip-api';
import { getBookingsForDate } from 'src/api/simplybook/simplybook-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import StoryblokClient from 'storyblok-js-client';
import { getCrispPeopleData, updateCrispProfileData } from '../api/crisp/crisp-api';
import { CoursePartnerService } from '../course-partner/course-partner.service';
import { CourseRepository } from '../course/course.repository';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { SessionRepository } from '../session/session.repository';
import { UserRepository } from '../user/user.repository';
import { CAMPAIGN_TYPE, SIMPLYBOOK_ACTION_ENUM, storyblokToken } from '../utils/constants';
import { formatTherapySessionObject } from '../utils/serialize';
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
    private mailchimpClient: MailchimpClient,
    private slackMessageClient: SlackMessageClient,
  ) {}

  async sendFirstTherapySessionFeedbackEmail() {
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const bookings = await getBookingsForDate(yesterday);

    let feedbackEmailsSent = 0;
    for (const booking of bookings) {
      if (await this.isFirstBooking(booking.clientEmail)) {
        this.mailchimpClient.sendTherapyFeedbackEmail(booking.clientEmail);

        this.logger.log(
          `First therapy session feedback email sent [email: ${
            booking.clientEmail
          }, session date: ${yesterday.toLocaleDateString()}]`,
        );

        await this.emailCampaignRepository.save({
          campaignType: CAMPAIGN_TYPE.THERAPY_FEEDBACK,
          email: booking.clientEmail,
          emailSentDateTime: new Date(),
        });

        this.logger.log(
          `First therapy session feedback email saved in db [email: ${
            booking.clientEmail
          }, session date: ${yesterday.toLocaleDateString()}]`,
        );
        feedbackEmailsSent++;
      }
    }
    return `First therapy session feedback emails sent to ${feedbackEmailsSent} client(s) for date: ${yesterday.toLocaleDateString()}`;
  }

  private async isFirstBooking(email: string) {
    const matchingEntries = await this.emailCampaignRepository.find({ email });
    return matchingEntries.length === 0;
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
    simplyBookDto: SimplybookBodyDto,
    partnerAccess: PartnerAccessEntity,
  ) {
    const therapySession = formatTherapySessionObject(simplyBookDto, partnerAccess.id);
    return await this.therapySessionRepository.save(therapySession);
  }

  private async updateTherapySession(
    action,
    simplyBookDto: SimplybookBodyDto,
    therapySession: TherapySessionEntity,
  ): Promise<TherapySessionEntity> {
    const updatedTherapySession = {
      ...therapySession,
      action,
      ...(action === SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING
        ? {
            rescheduledFrom: therapySession.startDateTime,
            startDateTime: moment(simplyBookDto.start_date_time).toDate(),
            endDateTime: moment(simplyBookDto.end_date_time).toDate(),
          }
        : {}),
      ...(action === SIMPLYBOOK_ACTION_ENUM.COMPLETED_BOOKING ? { completedAt: new Date() } : {}),
      ...(action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING ? { cancelledAt: new Date() } : {}),
    };

    return await this.therapySessionRepository.save(updatedTherapySession);
  }

  async updatePartnerAccessTherapy(
    simplyBookDto: SimplybookBodyDto,
  ): Promise<TherapySessionEntity> {
    const { action, client_email, booking_code } = simplyBookDto;
    this.logger.log(
      `UpdatePartnerAccessService method initiated for ${action} - ${client_email} - ${booking_code}`,
    );

    const userDetails = await this.userRepository.findOne({ email: client_email });

    if (!userDetails) {
      await this.slackMessageClient.sendMessageToTherapySlackChannel(
        `Unknown email address made a therapy booking - ${client_email} 🚨`,
      );
      this.logger.error(
        `UpdatePartnerAccessTherapy, Unable to find user with email ${client_email}`,
      );
      throw new HttpException(
        'UpdatePartnerAccessTherapy, Unable to find user',
        HttpStatus.BAD_REQUEST,
      );
    }

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
      return this.newPartnerAccessTherapy(therapyPartnerAccesses, simplyBookDto);
    }

    // We allow users to have multiple access codes, so we need to allow find therapy sessions to do with all the access codes
    const therapySession = await this.therapySessionRepository.findOne({
      where: [
        ...therapyPartnerAccesses.map((pa) => ({
          partnerAccessId: pa.id,
          bookingCode: simplyBookDto.booking_code,
        })),
      ],
    });

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
    simplyBookDto: SimplybookBodyDto,
  ) {
    const therapyPartnerAccess = partnerAccesses.filter(
      (tpa) => tpa.therapySessionsRemaining > 0,
    )[0];
    // if it is new booking, therapy sessions must be available
    if (typeof therapyPartnerAccess === 'undefined') {
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

  async updateStory({ action, story_id }: StoryDto) {
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
      storyblokId: Number(story.id),
      storyblokUuid: story.uuid,
    };

    try {
      if (story.content?.component === 'Course') {
        let course = await this.courseRepository.findOne({
          storyblokId: story.id,
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
        return course;
      } else if (story.content?.component === 'Session') {
        const course = await this.courseRepository.findOne({
          storyblokUuid: story.content.course,
        });

        if (!course.id) {
          throw new HttpException('COURSE NOT FOUND', HttpStatus.NOT_FOUND);
        }

        const session = await this.sessionRepository.findOne({
          storyblokId: story.id,
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
        return await this.sessionRepository.save(newSession);
      }
    } catch (error) {
      throw error;
    }
  }
}
