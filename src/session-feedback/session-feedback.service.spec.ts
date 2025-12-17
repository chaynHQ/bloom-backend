import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionEntity } from 'src/entities/session.entity';
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
  let mockSessionRepository: DeepMocked<Repository<SessionEntity>>;
  let mockSessionFeedbackRepository: DeepMocked<Repository<SessionFeedbackEntity>>;
  let mockSessionService: DeepMocked<SessionService>;
  let mockSlackMessageClient: DeepMocked<SlackMessageClient>;
  let mockEventLogRepository: DeepMocked<Repository<EventLogEntity>>;

  beforeEach(async () => {
    mockSessionRepository = createMock<Repository<SessionEntity>>();
    mockSessionFeedbackRepository = createMock<Repository<SessionFeedbackEntity>>();
    mockSessionService = createMock<SessionService>();
    mockSlackMessageClient = createMock<SlackMessageClient>();
    mockEventLogRepository = createMock<Repository<EventLogEntity>>(mockEventLogRepository);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionFeedbackService,
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: mockSessionRepository,
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
