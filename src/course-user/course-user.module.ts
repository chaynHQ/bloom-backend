import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserRepository } from './course-user.repository';
import { CourseUserService } from './course-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseUserRepository])],
  providers: [CourseUserService],
})
export class CourseUserModule {}
