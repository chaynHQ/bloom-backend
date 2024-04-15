import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEntity } from '../entities/course.entity';
import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';

@Injectable()
export class CourseService {
  constructor(@InjectRepository(CourseEntity) private courseRepository: Repository<CourseEntity>) {}

  async getCourseWithSessions(id: string): Promise<CourseEntity> {
    return await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.session', 'session')
      .where('course.courseId = :id', { id })
      .andWhere(`session.status = :status`, { status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED })
      .getOne();
  }

  async getCourse(id: string): Promise<CourseEntity> {
    return await this.courseRepository.findOneBy({ id });
  }
}
