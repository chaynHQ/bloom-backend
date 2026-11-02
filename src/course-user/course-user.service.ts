import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseUserEntity } from '../entities/course-user.entity';
import { CourseUserDto } from './dto/course-user.dto';

@Injectable()
export class CourseUserService {
  constructor(
    @InjectRepository(CourseUserEntity) private courseUserRepository: Repository<CourseUserEntity>,
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

  async getCourseUserByUserId(userId: string): Promise<CourseUserEntity[]> {
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

  // Returns whether this call created the row. A start and a complete for the same course can
  // arrive together, so the unique (userId, courseId) index decides which one creates it.
  async createCourseUserIfMissing({ userId, courseId }: CourseUserDto): Promise<boolean> {
    const result = await this.courseUserRepository
      .createQueryBuilder()
      .insert()
      .into(CourseUserEntity)
      .values({ userId, courseId, completed: false })
      .orIgnore()
      .returning('"courseUserId"')
      .execute();
    return result.raw.length > 0;
  }

  // One-way: returns whether this call changed the course from not completed to completed.
  async markCourseUserCompleted(courseUserId: string): Promise<boolean> {
    const result = await this.courseUserRepository.update(
      { id: courseUserId, completed: false },
      { completed: true, completedAt: new Date() },
    );
    return result.affected > 0;
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
