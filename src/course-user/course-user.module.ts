import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseUserService } from './course-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseUserEntity])],
  providers: [CourseUserService],
})
export class CourseUserModule {}
