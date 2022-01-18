import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from '../entities/session.entity';
import { SessionRepository } from './session.repository';

@Injectable()
export class SessionService {
  constructor(@InjectRepository(SessionRepository) private sessionRepository: SessionRepository) {}

  async getCourseFromSessionId(id: string): Promise<SessionEntity> {
    return await this.sessionRepository.findOne({ id });
  }
}
