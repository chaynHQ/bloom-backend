import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseController } from './course.controller';
import { CourseRepository } from './course.repository';
import { CourseService } from './course.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseRepository])],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
