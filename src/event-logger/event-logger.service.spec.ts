import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FrontChatService } from 'src/front-chat/front-chat.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { UserEntity } from 'src/entities/user.entity';
import {
  mockEventLoggerRepositoryMethods,
  mockUserRepositoryMethods,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { EVENT_NAME } from './event-logger.interface';
import { EventLoggerService } from './event-logger.service';

describe('EventLoggerService', () => {
  let service: EventLoggerService;
  let mockEventLoggerRepository: DeepMocked<Repository<EventLogEntity>>;
  let mockFrontChatService: DeepMocked<FrontChatService>;

  beforeEach(async () => {
    mockEventLoggerRepository = createMock<Repository<EventLogEntity>>(
      mockEventLoggerRepositoryMethods,
    );
    const mockedUserRepository = createMock<Repository<UserEntity>>(mockUserRepositoryMethods);
    mockFrontChatService = createMock<FrontChatService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventLoggerService,
        {
          provide: getRepositoryToken(EventLogEntity),
          useValue: mockEventLoggerRepository,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedUserRepository,
        },
        { provide: FrontChatService, useValue: mockFrontChatService },
      ],
    }).compile();

    service = module.get<EventLoggerService>(EventLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createEventLog', () => {
    it('should create and return an event log record', async () => {
      const response = await service.createEventLog({
        event: EVENT_NAME.CHAT_MESSAGE_SENT,
        date: new Date(2000, 1, 1),
        userId: 'userId',
      });
      expect(response).toMatchObject({
        id: 'logId',
        event: EVENT_NAME.CHAT_MESSAGE_SENT,
        date: new Date(2000, 1, 1),
        userId: 'userId',
      });
    });
  });
});
