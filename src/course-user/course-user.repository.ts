import { CourseUserEntity } from '../entities/course-user.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(CourseUserEntity)
export class CourseUserRepository extends Repository<CourseUserEntity> {}
