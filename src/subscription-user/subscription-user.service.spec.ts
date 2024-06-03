import { DeepMocked, createMock } from '@golevelup/ts-jest/lib/mocks';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { mockSubscriptionUserEntity, mockUserEntity } from 'test/utils/mockData';
import {
  mockSubscriptionUserRepositoryMethods,
  mockZapierWebhookClientMethods,
} from 'test/utils/mockedServices';
import { Repository } from 'typeorm/repository/Repository';
import { SubscriptionUserService } from './subscription-user.service';

describe('SubscriptionUserService', () => {
  let service: SubscriptionUserService;
  let mockedSubscriptionUserRepository: DeepMocked<Repository<SubscriptionUserEntity>>;

  let mockSubscriptionService: DeepMocked<SubscriptionService>;
  const mockedZapierWebhookClient = createMock<ZapierWebhookClient>(mockZapierWebhookClientMethods);

  beforeEach(async () => {
    mockedSubscriptionUserRepository = createMock<Repository<SubscriptionUserEntity>>(
      mockSubscriptionUserRepositoryMethods,
    );
    mockSubscriptionService = createMock<SubscriptionService>(mockSubscriptionService);

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
      ],
    }).compile();

    service = module.get<SubscriptionUserService>(SubscriptionUserService);
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
});
