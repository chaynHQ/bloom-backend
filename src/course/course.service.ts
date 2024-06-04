import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEntity } from '../entities/course.entity';

@Injectable()
export class CourseService {
  constructor(@InjectRepository(CourseEntity) private courseRepository: Repository<CourseEntity>) {}

  async getCourse(id: string): Promise<CourseEntity> {
    return await this.courseRepository.findOneBy({ id });
  }
}
