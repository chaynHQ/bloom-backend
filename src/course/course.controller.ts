import { Body, Controller, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dtos/create-course.dto';

@ApiTags('Course')
@ControllerDecorator()
@Controller('/v1/course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  async createCourse(@Body() createCourseDto: CreateCourseDto) {}

  @Put()
  async updateCourse() {}
}
