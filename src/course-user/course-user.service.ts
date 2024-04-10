import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseUserEntity } from '../entities/course-user.entity';
import { CourseUserRepository } from './course-user.repository';
import { CourseUserDto } from './dto/course-user.dto';

@Injectable()
export class CourseUserService {
  constructor(
    @InjectRepository(CourseUserRepository) private courseUserRepository: CourseUserRepository,
  ) {}

  async getCourseUser({ courseId, userId }: CourseUserDto): Promise<CourseUserEntity> {
    return await this.courseUserRepository
      .createQueryBuilder('course_user')
      .leftJoinAndSelect('course_user.course', 'course')
      .leftJoinAndSelect('course_user.sessionUser', 'sessionUser')
      .leftJoinAndSelect('sessionUser.session', 'session')
      .where('course_user.userId = :userId', { userId })
      .andWhere('course_user.courseId = :courseId', { courseId })
      .getOne();
  }

  async getCourseUserByUserId(userId: string) {
    return await this.courseUserRepository
      .createQueryBuilder('course_user')
      .leftJoinAndSelect('course_user.course', 'course')
      .leftJoinAndSelect('course_user.sessionUser', 'sessionUser')
      .leftJoinAndSelect('sessionUser.session', 'session')
      .where('course_user.userId = :userId', { userId })
      .getMany();
  }

  async createCourseUser({ userId, courseId }: CourseUserDto): Promise<CourseUserEntity> {
    return await this.courseUserRepository.save({
      courseId,
      userId,
      completed: false,
    });
  }

  async setCourseUserCompleted(
    { userId, courseId }: CourseUserDto,
    completed: boolean,
  ): Promise<CourseUserEntity> {
    const courseUser = await this.courseUserRepository.findOneBy({ userId, courseId });
    courseUser.completed = completed;
    courseUser.completedAt = completed ? new Date() : null;

    return await this.courseUserRepository.save(courseUser);
  }
}
