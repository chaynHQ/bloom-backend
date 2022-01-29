import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager } from 'typeorm';
import { CourseUserEntity } from '../entities/course-user.entity';
import { CourseUserRepository } from './course-user.repository';
import { CourseUserDto } from './dto/course-user.dto';

@Injectable()
export class CourseUserService {
  constructor(
    @InjectRepository(CourseUserRepository) private courseUserRepository: CourseUserRepository,
  ) {}

  async createCourseUser({ userId, courseId }: CourseUserDto): Promise<CourseUserEntity[]> {
    return await getManager().query(`WITH "course_user_alias" AS (
              INSERT INTO "course_user"("createdAt", "updatedAt", "courseUserId", "completed", "userId", "courseId") 
              VALUES (DEFAULT, DEFAULT, DEFAULT, false, '${userId}', '${courseId}') 
              ON CONFLICT DO NOTHING
              RETURNING * )
                SELECT * FROM "course_user_alias" UNION SELECT * FROM "course_user" 
                WHERE "userId"='${userId}' AND "courseId"='${courseId}'`);
  }

  async completeCourse({ userId, courseId }: CourseUserDto): Promise<CourseUserEntity> {
    const courseUser = await this.courseUserRepository.findOne({ where: { userId, courseId } });
    courseUser.completed = true;

    return await this.courseUserRepository.save(courseUser);
  }
}
