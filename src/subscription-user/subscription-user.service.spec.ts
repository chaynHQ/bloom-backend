/* eslint-disable */
import { DeepMocked, createMock } from '@golevelup/ts-jest/lib/mocks';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CrispService } from 'src/crisp/crisp.service';
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
import { Repository } from 'typeorm/repository/Repository';
import { SubscriptionUserService } from './subscription-user.service';
import { Logger } from '@nestjs/common';

describe('SubscriptionUserService', () => {
  let service: SubscriptionUserService;
  let mockedSubscriptionUserRepository: DeepMocked<Repository<SubscriptionUserEntity>>;
  let mockSubscriptionService: DeepMocked<SubscriptionService>;
  const mockedZapierWebhookClient = createMock<ZapierWebhookClient>(mockZapierWebhookClientMethods);
  let mockCrispService: DeepMocked<CrispService>;
  let mockEventLoggerService: DeepMocked<EventLoggerService>;
  let mockEventLogRepository: DeepMocked<Repository<EventLogEntity>>;

  beforeEach(async () => {
    mockedSubscriptionUserRepository = createMock<Repository<SubscriptionUserEntity>>(
      mockSubscriptionUserRepositoryMethods,
    );
    mockSubscriptionService = createMock<SubscriptionService>(mockSubscriptionService);
    mockCrispService = createMock<CrispService>();
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
        { provide: CrispService, useValue: mockCrispService },
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
      const response = await service.softDeleteSubscriptionsForUser(
        mockUserEntity.id,
        mockUserEntity.email,
      );
      expect(response).toMatchObject([
        { ...mockSubscriptionUserEntity, subscriptionInfo: 'Number Redacted' },
      ]);
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
        relations: ['subscription'],
      });
    });
  });
});
