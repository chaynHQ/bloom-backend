import { Module } from '@nestjs/common';
import { CourseUserController } from './course-user.controller';
import { CourseUserService } from './course-user.service';

@Module({
  controllers: [CourseUserController],
  providers: [CourseUserService]
})
export class CourseUserModule {}
