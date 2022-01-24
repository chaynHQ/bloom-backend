import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import apiCall from '../api/apiCalls';
import { CourseRepository } from '../course/course.repository';
import { CourseDto } from '../course/dtos/course.dto';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { SessionDto } from '../session/dto/session.dto';
import { SessionRepository } from '../session/session.repository';
import { UserRepository } from '../user/user.repository';
import { SIMPLYBOOK_ACTION_ENUM } from '../utils/constants';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    @InjectRepository(CourseRepository) private courseRepository: CourseRepository,
    @InjectRepository(SessionRepository) private sessionRepository: SessionRepository,
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

  async createCourse(courseDto: CourseDto) {
    const createCourseObject = this.courseRepository.create(courseDto);
    return await this.courseRepository.save(createCourseObject);
  }

  async updateCourse(storyblokId: string, body: Partial<CourseDto>) {
    await this.courseRepository.update({ storyblokId }, body);
    return await this.courseRepository.findOne({ storyblokId });
  }

  async createSession(sessionDto: SessionDto) {
    const createSessionObject = this.sessionRepository.create(sessionDto);
    return await this.sessionRepository.save(createSessionObject);
  }

  async updateSession(storyblokId: string, body: Partial<SessionDto>) {
    await this.sessionRepository.update({ storyblokId }, body);
    return await this.sessionRepository.findOne({ storyblokId });
  }
}
