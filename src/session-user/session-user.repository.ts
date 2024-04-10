import { Injectable } from '@nestjs/common';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SessionUserRepository extends Repository<SessionUserEntity> {}
