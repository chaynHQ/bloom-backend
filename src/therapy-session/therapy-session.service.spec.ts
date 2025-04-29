import { DeepMocked, createMock } from '@golevelup/ts-jest/lib/mocks';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { mockTherapySessionEntity, mockUserEntity } from 'test/utils/mockData';
import {
  mockSlackMessageClientMethods,
  mockTherapySessionRepositoryMethods,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm/repository/Repository';
import { TherapySessionService } from './therapy-session.service';

describe('TherapySessionService', () => {
  let service: TherapySessionService;
  let mockedTherapySessionRepository: DeepMocked<Repository<TherapySessionEntity>>;
  const mockedSlackMessageClient = createMock<SlackMessageClient>(mockSlackMessageClientMethods);

  beforeEach(async () => {
    mockedTherapySessionRepository = createMock<Repository<TherapySessionEntity>>(
      mockTherapySessionRepositoryMethods,
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TherapySessionService,
        {
          provide: getRepositoryToken(TherapySessionEntity),
          useValue: mockedTherapySessionRepository,
        },
        {
          provide: SlackMessageClient,
          useValue: mockedSlackMessageClient,
        },
      ],
    }).compile();

    service = module.get<TherapySessionService>(TherapySessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('softDeleteTherapySessions', () => {
    const redactedString = 'redactedEmail';
    it('when supplied with correct details, should redact email', async () => {
      const response = await service.softDeleteTherapySessions(
        mockUserEntity.id,
        mockUserEntity.email,
        redactedString,
      );
      expect(response).toMatchObject([
        { ...mockTherapySessionEntity, clientEmail: redactedString },
      ]);
    });
  });

  describe('getUserTherapySessions', () => {
    it('when supplied with correct details, should return therapy sessions', async () => {
      const response = await service.getUserTherapySessions(mockUserEntity.id);
      expect(response).toMatchObject([mockTherapySessionEntity]);
    });
  });

  describe('cancelTherapySession', () => {
    it('when supplied with correct details, should cancel therapy session', async () => {
      const response = await service.cancelTherapySession(mockTherapySessionEntity.id);
      expect(response).toMatchObject({
        ...mockTherapySessionEntity,
        cancelledAt: expect.any(Date),
        action: 'CANCELLED_BOOKING',
      });
    });
  });
});
