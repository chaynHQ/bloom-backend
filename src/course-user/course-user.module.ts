import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseUserService } from './course-user.service';
import { CoursesUserController } from './courses-user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CourseUserEntity])],
  controllers: [CoursesUserController],
  providers: [CourseUserService],
})
export class CourseUserModule {}
