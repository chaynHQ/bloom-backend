import { Injectable } from '@nestjs/common';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TherapySessionRepository extends Repository<TherapySessionEntity> {}
