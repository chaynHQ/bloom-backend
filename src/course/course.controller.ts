import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { CourseService } from './course.service';
import { CourseDto } from './dtos/course.dto';

@ApiTags('Course')
@ControllerDecorator()
@Controller('/v1/course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  async createCourse(@Body() courseDto: CourseDto) {
    return this.courseService.createCourse(courseDto);
  }

  @Patch(':storyblokId')
  async updateCourse(@Param('storyblokId') storyblokId: string, @Body() body: Partial<CourseDto>) {
    return this.courseService.updateCourse(storyblokId, body);
  }
}
