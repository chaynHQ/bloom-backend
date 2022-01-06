import { EntityRepository, Repository } from 'typeorm';
import { CourseEntity } from 'src/entities/course.entity';

@EntityRepository(CourseEntity)
export class CourseRepository extends Repository<CourseEntity> {}
