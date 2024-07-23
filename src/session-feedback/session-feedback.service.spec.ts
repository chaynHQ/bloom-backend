import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { SessionFeedbackService } from 'src/session-feedback/session-feedback.service';
import { SessionService } from 'src/session/session.service';
import { FEEDBACK_TAGS_ENUM } from 'src/utils/constants';
import { mockSessionEntity } from 'test/utils/mockData';
import { Repository } from 'typeorm';

const sessionFeedbackDto = {
  sessionFeedbackId: 'session-feedback-id',
  sessionId: mockSessionEntity.id,
  feedbackTags: FEEDBACK_TAGS_ENUM.INSPIRING,
  feedbackDescription: 'feedback-description',
};

describe('SessionFeedbackService', () => {
  let service: SessionFeedbackService;
  let mockPartnerAccessRepository: DeepMocked<Repository<PartnerAccessEntity>>;
  let mockPartnerRepository: DeepMocked<Repository<PartnerEntity>>;
  let mockUserRepository: DeepMocked<Repository<UserEntity>>;
  let mockSessionRepository: DeepMocked<Repository<SessionEntity>>;
  let mockSubscriptionUserRepository: DeepMocked<Repository<SubscriptionUserEntity>>;
  let mockSubscriptionRepository: DeepMocked<Repository<SubscriptionEntity>>;
  let mockTherapySessionRepository: DeepMocked<Repository<TherapySessionEntity>>;
  let mockSessionFeedbackRepository: DeepMocked<Repository<SessionFeedbackEntity>>;
  let mockSessionService: DeepMocked<SessionService>;
  let mockSlackMessageClient: DeepMocked<SlackMessageClient>;

  beforeEach(async () => {
    mockPartnerAccessRepository = createMock<Repository<PartnerAccessEntity>>();
    mockPartnerRepository = createMock<Repository<PartnerEntity>>();
    mockUserRepository = createMock<Repository<UserEntity>>();
    mockSessionRepository = createMock<Repository<SessionEntity>>();
    mockSubscriptionUserRepository = createMock<Repository<SubscriptionUserEntity>>();
    mockSubscriptionRepository = createMock<Repository<SubscriptionEntity>>();
    mockTherapySessionRepository = createMock<Repository<TherapySessionEntity>>();
    mockSessionFeedbackRepository = createMock<Repository<SessionFeedbackEntity>>();
    mockSessionService = createMock<SessionService>();
    mockSlackMessageClient = createMock<SlackMessageClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionFeedbackService,
        {
          provide: getRepositoryToken(PartnerAccessEntity),
          useValue: mockPartnerAccessRepository,
        },
        {
          provide: getRepositoryToken(PartnerEntity),
          useValue: mockPartnerRepository,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionUserEntity),
          useValue: mockSubscriptionUserRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionEntity),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(TherapySessionEntity),
          useValue: mockTherapySessionRepository,
        },
        {
          provide: getRepositoryToken(SessionFeedbackEntity),
          useValue: mockSessionFeedbackRepository,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        { provide: SlackMessageClient, useValue: mockSlackMessageClient },
      ],
    }).compile();

    service = module.get<SessionFeedbackService>(SessionFeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createSessionFeedback', () => {
    it('when session id exists should return dto', async () => {
      jest
        .spyOn(mockSessionService, 'getSessionAndCourse')
        .mockResolvedValueOnce(mockSessionEntity);
      const response = await service.createSessionFeedback(sessionFeedbackDto);

      expect(response).toMatchObject(sessionFeedbackDto);
    });
    it('when session id does not exist should throw exception', async () => {
      jest.spyOn(mockSessionService, 'getSessionAndCourse').mockResolvedValueOnce(null);

      await expect(service.createSessionFeedback(sessionFeedbackDto)).rejects.toThrow(
        new HttpException('SESSION NOT FOUND', HttpStatus.NOT_FOUND),
      );
    });
  });
});
