import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import StoryblokClient from 'storyblok-js-client';
import apiCall from '../api/apiCalls';
import { getCrispPeopleData, updateCrispProfile } from '../api/crisp/crisp-api';
import { CoursePartnerService } from '../course-partner/course-partner.service';
import { CourseRepository } from '../course/course.repository';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { SessionRepository } from '../session/session.repository';
import { UserRepository } from '../user/user.repository';
import { SIMPLYBOOK_ACTION_ENUM, storyblokToken } from '../utils/constants';
import { formatTherapySessionObject } from '../utils/serialize';
import { StoryDto } from './dto/story.dto';
import { TherapySessionRepository } from './therapy-session.repository';

const Storyblok = new StoryblokClient({
  accessToken: storyblokToken,
  cache: {
    clear: 'auto',
    type: 'memory',
  },
});

@Injectable()
export class WebhooksService {
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
  ) {}

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

  async updateCrispProfileSessionsData(action, email) {
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

    updateCrispProfile(partnerAccessUpdateCrisp, email);

    return 'ok';
  }

  private async upadateTherapySession(
    action,
    simplyBookDto: SimplybookBodyDto,
    partnerAccess: PartnerAccessEntity,
  ): Promise<string> {
    const therapySessions = await this.therapySessionRepository.find({
      partnerAccessId: partnerAccess.id,
    });

    const activeSessions = therapySessions
      .filter((ts) => {
        return ts.cancelledAt === null && ts.completedAt === null;
      })
      .sort((a: any, b: any) => {
        return a.start_date_time - b.start_date_time;
      });

    if (action !== SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING && activeSessions.length === 0) {
      throw new HttpException('No active therapy sessions', HttpStatus.FORBIDDEN);
    }

    if (action !== SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING) {
      activeSessions[0].action = action;
    }

    switch (action) {
      case SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING:
        activeSessions[0].rescheduledFrom = activeSessions[0].startDateTime;
        break;
      case SIMPLYBOOK_ACTION_ENUM.COMPLETED_BOOKING:
        activeSessions[0].completedAt = new Date();
        break;
      case SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING:
        activeSessions[0].cancelledAt = new Date();
        break;
      default:
        break;
    }

    const therapySessionObject =
      action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING
        ? formatTherapySessionObject(simplyBookDto, partnerAccess.id)
        : activeSessions[0];

    await this.therapySessionRepository.save(therapySessionObject);

    return 'Successful';
  }

  async updatePartnerAccessBooking(simplyBookDto: SimplybookBodyDto): Promise<string> {
    const { action, client_email } = simplyBookDto;
    const userDetails = await this.userRepository.findOne({ email: client_email });

    if (!userDetails) {
      await apiCall({
        url: process.env.SLACK_WEBHOOK_URL,
        type: 'post',
        data: {
          text: `Unknown email address made a therapy booking - ${client_email} 🚨`,
        },
      });
      throw new HttpException('Unable to find user', HttpStatus.BAD_REQUEST);
    }

    const usersPartnerAccesses = await this.partnerAccessRepository.find({
      userId: userDetails.id,
      active: true,
    });

    if (usersPartnerAccesses.length === 0) {
      throw new HttpException('Unable to find partner access code', HttpStatus.BAD_REQUEST);
    }
    let hasFeatureLiveChat = false;

    const partnerAccess: PartnerAccessEntity[] = usersPartnerAccesses
      .filter((pa) => {
        if (pa.featureLiveChat === true) {
          hasFeatureLiveChat = true;
        }
        return pa.featureTherapy === true && pa.therapySessionsRemaining > 0;
      })
      .sort((a: any, b: any) => {
        return a.createdAt - b.createdAt;
      });

    if (partnerAccess.length === 0) {
      throw new HttpException('No therapy sessions remaining', HttpStatus.FORBIDDEN);
    }

    hasFeatureLiveChat && this.updateCrispProfileSessionsData(action, client_email);

    let partnerAccessUpdateDetails = {};

    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING) {
      partnerAccessUpdateDetails = {
        therapySessionsRemaining: partnerAccess[0].therapySessionsRemaining - 1,
        therapySessionsRedeemed: partnerAccess[0].therapySessionsRedeemed + 1,
      };
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) {
      partnerAccessUpdateDetails = {
        therapySessionsRemaining: partnerAccess[0].therapySessionsRemaining + 1,
        therapySessionsRedeemed: partnerAccess[0].therapySessionsRedeemed - 1,
      };
    }

    try {
      await this.upadateTherapySession(action, simplyBookDto, partnerAccess[0]);
      await this.partnerAccessRepository.save(
        Object.assign(partnerAccess[0], { ...partnerAccessUpdateDetails }),
      );

      return 'Successful';
    } catch (error) {
      return error;
    }
  }

  async updateStory({ action, story_id }: StoryDto) {
    const {
      data: { story },
    } = await Storyblok.get(`cdn/stories/${story_id}`);

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
      } else if (story.content?.component === 'Session') {
        const { id } = await this.courseRepository.findOne({
          storyblokUuid: story.content.course,
        });

        if (!id) {
          throw new HttpException('COURSE NOT FOUND', HttpStatus.NOT_FOUND);
        }

        let session = await this.sessionRepository.findOne({
          storyblokId: story.id,
        });

        if (!!session) {
          session.status = action;
          session.slug = story.full_slug;
          session.name = story.name;
        } else {
          session = this.sessionRepository.create({ ...storyData, ...{ courseId: id } });
        }

        await this.sessionRepository.save(session);
      }
      return 'ok';
    } catch (error) {
      throw error;
    }
  }
}
