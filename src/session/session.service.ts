import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from '../entities/session.entity';
import { SessionRepository } from './session.repository';

@Injectable()
export class SessionService {
  constructor(@InjectRepository(SessionRepository) private sessionRepository: SessionRepository) {}

  async getSession(id: string): Promise<SessionEntity> {
    return await this.sessionRepository.findOne({ id });
  }

  async getSessionByStoryblokId(storyblokId: number): Promise<SessionEntity> {
    return await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.course', 'course')
      .where('session.storyblokId = :storyblokId', { storyblokId })
      .getOne();
  }
}
