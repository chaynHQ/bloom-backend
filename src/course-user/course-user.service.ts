import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseUserRepository } from './course-user.repository';

@Injectable()
export class CourseUserService {
  constructor(
    @InjectRepository(CourseUserRepository) private courseUserRepository: CourseUserRepository,
  ) {}

  async courseUserExists(userId: string, courseId: string) {
    return await this.courseUserRepository.findOne({ userId, courseId });
  }

  async createCourseUser(courseId: string, userId: string) {
    const createCourseUserObject = this.courseUserRepository.create({
      courseId,
      userId,
      completed: false,
    });

    return await this.courseUserRepository.save(createCourseUserObject);
  }
}
