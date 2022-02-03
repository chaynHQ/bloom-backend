import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseEntity } from '../entities/course.entity';
import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';
import { CourseRepository } from './course.repository';

@Injectable()
export class CourseService {
  constructor(@InjectRepository(CourseRepository) private courseRepository: CourseRepository) {}

  async getCourseWithSessions(id: string): Promise<CourseEntity> {
    try {
      return await this.courseRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.session', 'session')
        .where('course.courseId = :id', { id })
        .andWhere(`session.status = :status`, { status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED })
        .getOne();
    } catch (error) {
      throw error;
    }
  }
}
