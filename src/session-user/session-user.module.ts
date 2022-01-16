import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserRepository } from 'src/course-user/course-user.repository';
import { CourseUserService } from 'src/course-user/course-user.service';
import { SessionUserController } from './session-user.controller';
import { SessionUserRepository } from './session-user.repository';
import { SessionUserService } from './session-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([SessionUserRepository, CourseUserRepository])],
  controllers: [SessionUserController],
  providers: [SessionUserService, CourseUserService],
})
export class SessionUserModule {}
