import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseRepository } from './course.repository';
import { CourseDto } from './dtos/course.dto';

@Injectable()
export class CourseService {
  constructor(@InjectRepository(CourseRepository) private courseRepository: CourseRepository) {}

  async createCourse(createCourseDto: CourseDto) {
    const createCourseObject = this.courseRepository.create(createCourseDto);
    return await this.courseRepository.save(createCourseObject);
  }

  async updateCourse(storyblokId: string, body: Partial<CourseDto>) {
    await this.courseRepository.update({ storyblokId }, body);
    return await this.courseRepository.findOne({ storyblokId });
  }
}
