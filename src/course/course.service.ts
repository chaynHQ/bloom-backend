import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseRepository } from './course.repository';
import { CreateCourseDto } from './dtos/create-course.dto';

@Injectable()
export class CourseService {
  constructor(@InjectRepository(CourseRepository) private courseRepository: CourseRepository) {}

  async createCourse(createCourseDto: CreateCourseDto) {
    const createCourseObject = this.courseRepository.create(createCourseDto);
  }
}
