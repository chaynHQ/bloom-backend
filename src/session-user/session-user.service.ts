import { Body, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseUserService } from '../course-user/course-user.service';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
import { SessionUserRepository } from './session-user.repository';

@Injectable()
export class SessionUserService {
  constructor(
    @InjectRepository(SessionUserRepository) private sessionUserRepository: SessionUserRepository,
    private readonly courseUserService: CourseUserService,
  ) {}

  public async createSessionUser() {
    let courseUser = await this.courseUserService.courseUserExists(
      'b316f2d1-f728-4752-8a18-f14624da8a36',
      'b50da468-dca9-4264-9a72-562419a10860',
    );

    if (!courseUser) {
      courseUser = await this.courseUserService.createCourseUser(
        'b50da468-dca9-4264-9a72-562419a10860',
        'b316f2d1-f728-4752-8a18-f14624da8a36',
      );
    }

    const createSessionUserObject = this.sessionUserRepository.create({
      sessionId: '30e89ff8-d1cd-4d3c-8ff2-494bc0aebe82',
      courseUserId: courseUser.id,
      completed: true,
    });

    const exists = await this.sessionUserRepository.findOne({
      courseUserId: courseUser.id,
      sessionId: '30e89ff8-d1cd-4d3c-8ff2-494bc0aebe82',
    });
    return !!exists ? exists : await this.sessionUserRepository.save(createSessionUserObject);
  }
}
