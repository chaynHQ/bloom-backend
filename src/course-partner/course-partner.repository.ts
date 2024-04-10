import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CoursePartnerEntity } from '../entities/course-partner.entity';

@Injectable()
export class CoursePartnerRepository extends Repository<CoursePartnerEntity> {}
