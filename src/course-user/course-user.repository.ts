import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CourseUserEntity } from '../entities/course-user.entity';

@Injectable()
export class CourseUserRepository extends Repository<CourseUserEntity> {}
