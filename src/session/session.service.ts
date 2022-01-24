import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionDto } from './dto/session.dto';
import { SessionRepository } from './session.repository';

@Injectable()
export class SessionService {
  constructor(@InjectRepository(SessionRepository) private sessionRepository: SessionRepository) {}

  async createSession(sessionDto: SessionDto) {
    const createSessionObject = this.sessionRepository.create(sessionDto);
    return await this.sessionRepository.save(createSessionObject);
  }

  async updateSession(storyblokId: string, body: Partial<SessionDto>) {
    await this.sessionRepository.update({ storyblokId }, body);
    return await this.sessionRepository.findOne({ storyblokId });
  }
}
