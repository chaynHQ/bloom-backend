import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(SessionEntity) private sessionRepository: Repository<SessionEntity>,
  ) {}

  async getSession(id: string): Promise<SessionEntity> {
    return await this.sessionRepository.findOneBy({ id });
  }

  async getSessionByStoryblokId(storyblokId: number): Promise<SessionEntity> {
    return await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.course', 'course')
      .where('session.storyblokId = :storyblokId', { storyblokId })
      .getOne();
  }
}
