import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserController } from './course-user.controller';
import { CourseUserRepository } from './course-user.repository';
import { CourseUserService } from './course-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseUserRepository])],
  controllers: [CourseUserController],
  providers: [CourseUserService],
})
export class CourseUserModule {}
