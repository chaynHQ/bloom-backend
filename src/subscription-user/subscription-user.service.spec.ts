import { DeepMocked, createMock } from '@golevelup/ts-jest/lib/mocks';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { FrontChatService } from 'src/front-chat/front-chat.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { mockSubscriptionUserEntity, mockUserEntity } from 'test/utils/mockData';
import {
  mockClsService,
  mockSubscriptionUserRepositoryMethods,
  mockZapierWebhookClientMethods,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import { SubscriptionUserService } from './subscription-user.service';

describe('SubscriptionUserService', () => {
  let service: SubscriptionUserService;
  let mockedSubscriptionUserRepository: DeepMocked<Repository<SubscriptionUserEntity>>;
  let mockSubscriptionService: DeepMocked<SubscriptionService>;
  const mockedZapierWebhookClient = createMock<ZapierWebhookClient>(mockZapierWebhookClientMethods);
  let mockFrontChatService: DeepMocked<FrontChatService>;
  let mockEventLoggerService: DeepMocked<EventLoggerService>;
  let mockEventLogRepository: DeepMocked<Repository<EventLogEntity>>;

  beforeEach(async () => {
    // mockedZapierWebhookClient is created once at module scope, so its call history and
    // any queued one-off implementations leak between tests unless cleared.
    jest.clearAllMocks();

    mockedSubscriptionUserRepository = createMock<Repository<SubscriptionUserEntity>>(
      mockSubscriptionUserRepositoryMethods,
    );
    mockSubscriptionService = createMock<SubscriptionService>(mockSubscriptionService);
    mockFrontChatService = createMock<FrontChatService>();
    mockEventLoggerService = createMock<EventLoggerService>();
    mockEventLogRepository = createMock<Repository<EventLogEntity>>(mockEventLogRepository);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionUserService,
        {
          provide: getRepositoryToken(SubscriptionUserEntity),
          useValue: mockedSubscriptionUserRepository,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
        {
          provide: ZapierWebhookClient,
          useValue: mockedZapierWebhookClient,
        },
        {
          provide: getRepositoryToken(EventLogEntity),
          useValue: mockEventLogRepository,
        },
        { provide: FrontChatService, useValue: mockFrontChatService },
        { provide: EventLoggerService, useValue: mockEventLoggerService },
      ],
    }).compile();

    service = module.get<SubscriptionUserService>(SubscriptionUserService);
    const logger = (service as any).logger as Logger;
    (logger as any).cls = mockClsService;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('softDeleteSubscriptions', () => {
    it('when supplied with correct data should delete number from respond.io and redact number', async () => {
      const response = await service.softDeleteSubscriptionsForUser(mockUserEntity.id);
      expect(response).toMatchObject([
        { ...mockSubscriptionUserEntity, subscriptionInfo: 'Number Redacted' },
      ]);
    });

    // A subscription loaded from the database has cancelledAt of null, not undefined. The
    // guard here previously compared with !== null, which is false for null and true for
    // undefined, so it passed against the mock and silently skipped respond.io in
    // production. These tests pin the null case.
    const givenSubscription = (subscription: SubscriptionUserEntity) => {
      mockedSubscriptionUserRepository.find.mockResolvedValueOnce([subscription]);
      // cancelWhatsappSubscription re-reads the row, so the query builder must return it too.
      mockedSubscriptionUserRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(subscription),
      } as any);
    };

    it('removes an active subscription from respond.io before redacting the number', async () => {
      givenSubscription({
        ...mockSubscriptionUserEntity,
        cancelledAt: null,
      } as unknown as SubscriptionUserEntity);

      const response = await service.softDeleteSubscriptionsForUser(mockUserEntity.id);

      expect(mockedZapierWebhookClient.deleteContactFromRespondIO).toHaveBeenCalledWith({
        phonenumber: mockSubscriptionUserEntity.subscriptionInfo,
      });
      expect(response[0].subscriptionInfo).toBe('Number Redacted');
    });

    it('does not call respond.io again for an already cancelled subscription', async () => {
      givenSubscription({
        ...mockSubscriptionUserEntity,
        cancelledAt: new Date(),
      } as unknown as SubscriptionUserEntity);

      const response = await service.softDeleteSubscriptionsForUser(mockUserEntity.id);

      expect(mockedZapierWebhookClient.deleteContactFromRespondIO).not.toHaveBeenCalled();
      expect(response[0].subscriptionInfo).toBe('Number Redacted');
    });

    it('retains the number when respond.io removal fails, so the contact can still be found', async () => {
      givenSubscription({
        ...mockSubscriptionUserEntity,
        cancelledAt: null,
      } as unknown as SubscriptionUserEntity);
      mockedZapierWebhookClient.deleteContactFromRespondIO.mockRejectedValueOnce(
        new Error('zapier unavailable'),
      );

      const response = await service.softDeleteSubscriptionsForUser(mockUserEntity.id);

      expect(response[0].subscriptionInfo).toBe(mockSubscriptionUserEntity.subscriptionInfo);
      expect(response[0].subscriptionInfo).not.toBe('Number Redacted');
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return a list of subscriptions for the given userId', async () => {
      const result = await service.getSubscriptions(mockUserEntity.id);

      expect(result).toMatchObject([mockSubscriptionUserEntity]);
    });

    it('should return an empty array if the user has no subscriptions', async () => {
      mockedSubscriptionUserRepository.find.mockResolvedValueOnce([]);

      const result = await service.getSubscriptions(mockUserEntity.id);

      expect(result).toEqual([]);
      expect(mockedSubscriptionUserRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserEntity.id },
        relations: { subscription: true },
      });
    });
  });
});
