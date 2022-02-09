import { EntityRepository, Repository } from 'typeorm';
import { CoursePartnerEntity } from '../entities/course-partner.entity';

@EntityRepository(CoursePartnerEntity)
export class CoursePartnerRepository extends Repository<CoursePartnerEntity> {}
