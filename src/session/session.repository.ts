import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class SessionRepository extends Repository<SessionEntity> {}
