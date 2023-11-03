import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { mockEventLoggerRepositoryMethods } from 'test/utils/mockedServices';
import { EVENT_NAME } from './event-logger.interface';
import { EventLoggerRepository } from './event-logger.repository';
import { EventLoggerService } from './event-logger.service';

describe('EventLoggerService', () => {
  let service: EventLoggerService;
  let mockEventLoggerRepository: DeepMocked<EventLoggerRepository>;

  beforeEach(async () => {
    mockEventLoggerRepository = createMock<EventLoggerRepository>(mockEventLoggerRepositoryMethods);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventLoggerService,
        {
          provide: EventLoggerRepository,
          useValue: mockEventLoggerRepository,
        },
      ],
    }).compile();

    service = module.get<EventLoggerService>(EventLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createEventLog', () => {
    it('when supplied with correct data should return new feature', async () => {
      const response = await service.createEventLog({
        event: EVENT_NAME.CHAT_MESSAGE_SENT,
        date: new Date(2000, 1, 1),
        userId: 'userId',
      });
      expect(response).toMatchObject({
        id: 'newId',
        event: EVENT_NAME.CHAT_MESSAGE_SENT,
        date: new Date(2000, 1, 1),
        userId: 'userId',
      });
    });
  });
});
