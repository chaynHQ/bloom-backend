import { Injectable } from '@nestjs/common';
import { CourseEntity } from 'src/entities/course.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CourseRepository extends Repository<CourseEntity> {}
