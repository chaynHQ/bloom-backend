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

  async courseUserExists({ userId, courseId }: CourseUserDto): Promise<CourseUserEntity> {
    return await this.courseUserRepository.findOne({ userId, courseId });
  }

  async createCourseUser({ userId, courseId }: CourseUserDto): Promise<CourseUserEntity> {
    const createCourseUserObject = this.courseUserRepository.create({
      courseId,
      userId,
      completed: false,
    });

    return await this.courseUserRepository.save(createCourseUserObject);
  }

  async updateCourseUser({ userId, courseId }: CourseUserDto): Promise<CourseUserEntity> {
    const courseUser = await this.courseUserRepository.findOne({ where: { userId, courseId } });
    courseUser.completed = true;

    return await this.courseUserRepository.save(courseUser);
  }
}
