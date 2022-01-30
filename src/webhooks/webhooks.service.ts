import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CourseEntity } from 'src/entities/course.entity';
import { SessionEntity } from 'src/entities/session.entity';
import StoryblokClient from 'storyblok-js-client';
import apiCall from '../api/apiCalls';
import { CourseRepository } from '../course/course.repository';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { SessionRepository } from '../session/session.repository';
import { UserRepository } from '../user/user.repository';
import { SIMPLYBOOK_ACTION_ENUM, storyblokToken } from '../utils/constants';
import { StoryDto } from './dto/story.dto';

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
  ) {}
  async updatePartnerAccessBooking({ action, client_email }: SimplybookBodyDto): Promise<string> {
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

    const partnerAccessDetails = await this.partnerAccessRepository.findOne({
      userId: userDetails.id,
    });

    if (!partnerAccessDetails) {
      throw new HttpException('Unable to find partner access code', HttpStatus.BAD_REQUEST);
    }

    let partnerAccessUpdateDetails = {};

    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING) {
      if (Number(partnerAccessDetails.therapySessionsRemaining) === 0) {
        throw new HttpException('No therapy sessions remaining', HttpStatus.FORBIDDEN);
      }

      partnerAccessUpdateDetails = {
        therapySessionsRemaining: Number(partnerAccessDetails.therapySessionsRemaining) - 1,
        therapySessionsRedeemed: Number(partnerAccessDetails.therapySessionsRedeemed) + 1,
      };
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) {
      partnerAccessUpdateDetails = {
        therapySessionsRemaining: Number(partnerAccessDetails.therapySessionsRemaining) + 1,
        therapySessionsRedeemed: Number(partnerAccessDetails.therapySessionsRedeemed) - 1,
      };
    }

    try {
      await this.partnerAccessRepository.save({
        ...partnerAccessDetails,
        ...partnerAccessUpdateDetails,
      });

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

    const createCourseObject = this.courseRepository.create({
      name: story.name,
      slug: story.full_slug,
      status: action,
      storyblokId: story.uuid,
    });

    try {
      if (story.content?.component === 'Course') {
        await this.courseRepository
          .createQueryBuilder('course')
          .insert()
          .into(CourseEntity)
          .values(createCourseObject)
          .onConflict(`("storyblokId") DO UPDATE SET "status" = '${action}'`)
          .execute();

        await this.coursePartnerService.createCoursePartner(story.content?.included_for_partners);

        return createCourseObject;
      } else if (story.content?.component === 'Session') {
        const { id } = await this.courseRepository.findOne({ storyblokId: story.content.course });

        if (!id) {
          throw new HttpException('COURSE NOT FOUND', HttpStatus.NOT_FOUND);
        }

        await this.sessionRepository
          .createQueryBuilder('session')
          .insert()
          .into(SessionEntity)
          .values({ ...createCourseObject, ...{ courseId: id } })
          .onConflict(`("storyblokId") DO UPDATE SET "status" = '${action}'`)
          .execute();

        return { ...createCourseObject, ...{ courseId: id } };
      }
    } catch (error) {
      throw error;
    }
  }
}
