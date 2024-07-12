import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { SessionService } from '../session/session.service';
import { SessionFeedbackDto } from './dtos/session-feedback.dto';

@Injectable()
export class SessionFeedbackService {
  constructor(
    @InjectRepository(PartnerAccessEntity)
    private partnerAccessRepository: Repository<PartnerAccessEntity>,
    @InjectRepository(PartnerEntity)
    private partnerRepository: Repository<PartnerEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(SubscriptionUserEntity)
    private subscriptionUserRepository: Repository<SubscriptionUserEntity>,
    @InjectRepository(SubscriptionEntity)
    private subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(TherapySessionEntity)
    private therapySessionRepository: Repository<TherapySessionEntity>,
    @InjectRepository(SessionFeedbackEntity)
    private sessionFeedbackRepository: Repository<SessionFeedbackEntity>,
    private readonly sessionService: SessionService,
  ) {}

  public async createSessionFeedback(
    sessionFeedbackDto: SessionFeedbackDto,
  ): Promise<SessionFeedbackDto> {
    const session = await this.sessionService.getSession(sessionFeedbackDto.sessionId);

    if (!session) {
      throw new HttpException('SESSION NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const sessionFeedbackObject = this.sessionFeedbackRepository.create(sessionFeedbackDto);
    await this.sessionFeedbackRepository.save(sessionFeedbackObject);

    return sessionFeedbackDto;
  }
}
