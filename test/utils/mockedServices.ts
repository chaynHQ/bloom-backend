import { PartialFuncReturn } from '@golevelup/ts-jest';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { ClsService } from 'nestjs-cls';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CoursePartnerEntity } from 'src/entities/course-partner.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { FeatureEntity } from 'src/entities/feature.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { CreateUserDto } from 'src/user/dtos/create-user.dto';
import { UpdateUserDto } from 'src/user/dtos/update-user.dto';
import { WebhooksService } from 'src/webhooks/webhooks.service';
import { DeepPartial, Repository } from 'typeorm';
import {
  mockCourse,
  mockCoursePartnerEntity,
  mockEventLog,
  mockFeatureEntity,
  mockPartnerAccessEntity,
  mockPartnerAccessEntityBase,
  mockPartnerAdminEntity,
  mockPartnerEntity,
  mockPartnerFeatureEntity,
  mockResource,
  mockSession,
  mockSubscriptionUserEntity,
  mockTherapySessionEntity,
  mockUserEntity,
  mockUserRecord,
} from './mockData';
import { createQueryBuilderMock } from './mockUtils';

export const mockSlackMessageClientMethods: PartialFuncReturn<SlackMessageClient> = {
  sendMessageToTherapySlackChannel: async () => {
    return 'successful test message';
  },
};

export const mockWebhooksServiceMethods: PartialFuncReturn<WebhooksService> = {
  updatePartnerAccessTherapy: async () => {
    return mockTherapySessionEntity;
  },
};

export const mockClsService = {
  getId: jest.fn().mockReturnValue('mockRequestId'),
  get: jest.fn().mockReturnValue('mockSessionId'),
} as Partial<jest.Mocked<ClsService>> as jest.Mocked<ClsService>;

export const mockPartnerServiceMethods = {
  getPartnerById: async (arg): Promise<PartnerEntity> => {
    return { ...mockPartnerEntity, id: arg };
  },
  getPartnerWithPartnerFeaturesByName: async (arg): Promise<PartnerEntity> => {
    return { ...mockPartnerEntity, name: arg };
  },
};

export const mockPartnerFeatureServiceMethods = {
  createPartnerFeature: async (arg): Promise<PartnerFeatureEntity> => {
    return { ...mockPartnerFeatureEntity, ...arg };
  },
};

export const mockFeatureServiceMethods = {
  createFeature: async (arg): Promise<PartnerFeatureEntity> => {
    return { ...mockPartnerFeatureEntity, ...arg };
  },
};

export const mockAuthServiceMethods = {
  createFirebaseUser: async (): Promise<UserRecord> => {
    return mockUserRecord;
  },
  getFirebaseUser: async (): Promise<UserRecord> => {
    return mockUserRecord;
  },
};

export const mockSessionRepositoryMethods: PartialFuncReturn<Repository<SessionEntity>> = {
  findOneBy: async () => {
    return mockSession;
  },
  save: async (entity) => {
    return entity as SessionEntity;
  },
  create: () => {
    return mockSession;
  },
};

export const mockResourceRepositoryMethods: PartialFuncReturn<Repository<ResourceEntity>> = {
  findOneBy: async () => {
    return mockResource;
  },
  save: async (entity) => {
    return entity as ResourceEntity;
  },
  create: () => {
    return mockResource;
  },
};

export const mockCourseRepositoryMethods: PartialFuncReturn<Repository<CourseEntity>> = {
  findOneBy: async () => {
    return mockCourse;
  },
  findOneByOrFail: async () => {
    return mockCourse;
  },
  create: () => {
    return mockCourse;
  },
  save: async (entity) => {
    return entity as CourseEntity;
  },
};

export const mockCoursePartnerServiceMethods: PartialFuncReturn<CoursePartnerService> = {
  updateCoursePartners: async () => {
    return [];
  },
};

export const mockCoursePartnerRepositoryMethods: PartialFuncReturn<
  Repository<CoursePartnerEntity>
> = {
  save: async (arg) => {
    return { ...mockCoursePartnerEntity, ...arg } as CoursePartnerEntity;
  },
};

export const mockPartnerAdminRepositoryMethods: PartialFuncReturn<Repository<PartnerAdminEntity>> =
  {
    findOneBy: async (arg) => {
      return { ...mockPartnerAdminEntity, ...(arg ? arg : {}) } as PartnerAdminEntity;
    },
    save: async (arg) => {
      return { ...mockPartnerAdminEntity, ...arg } as PartnerAdminEntity;
    },
    create: (dto) => {
      return {
        ...mockPartnerAdminEntity,
        ...dto,
      };
    },
  };

export const mockTherapySessionRepositoryMethods: PartialFuncReturn<
  Repository<TherapySessionEntity>
> = {
  createQueryBuilder: createQueryBuilderMock({
    getMany: jest.fn().mockResolvedValue([mockTherapySessionEntity]),
  }),
  findOneBy: async (arg) => {
    return { ...mockTherapySessionEntity, ...(arg ? arg : {}) } as TherapySessionEntity;
  },
  findOne: async (arg) => {
    return { ...mockTherapySessionEntity, ...(arg ? arg : {}) } as TherapySessionEntity;
  },
  findOneOrFail: async (arg) => {
    return { ...mockTherapySessionEntity, ...(arg ? arg : {}) } as TherapySessionEntity;
  },
  save: async (arg) => {
    return { ...mockTherapySessionEntity, ...arg } as TherapySessionEntity;
  },
  create: (arg: DeepPartial<TherapySessionEntity>) => {
    return { ...arg, id: 'newTherapySessionId' } as TherapySessionEntity;
  },
};

export const mockUserRepositoryMethods: PartialFuncReturn<Repository<UserEntity>> = {
  createQueryBuilder: createQueryBuilderMock(),
  findOneBy: async (arg) => {
    return { ...mockUserEntity, ...(arg ? { ...arg } : {}) } as UserEntity;
  },
  find: async () => {
    return [mockUserEntity, mockUserEntity];
  },
  findBy: async () => {
    return [mockUserEntity, mockUserEntity];
  },
  save: async (arg) => arg as UserEntity,
};

export const mockUserRepositoryMethodsFactory = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto: CreateUserDto): UserEntity | Error => {
    return {
      ...mockUserEntity,
      ...dto,
    };
  },
  update: (dto: UpdateUserDto) => {
    return {
      ...mockUserEntity,
      ...dto,
    };
  },
  find: async () => {
    return [mockUserEntity];
  },
  findOneBy: ({ email: client_email }) => {
    return { ...mockUserEntity, ...(client_email ? { email: client_email } : {}) };
  },
  save: (arg) => arg,
};

export const mockPartnerAccessRepositoryMethods: PartialFuncReturn<
  Repository<PartnerAccessEntity>
> = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto) => {
    return {
      ...mockPartnerAccessEntityBase,
      ...dto,
      accessCode: '123456',
    };
  },
  findOneBy: async (arg) => {
    return { ...mockPartnerAccessEntity, ...(arg ? { ...arg } : {}) } as PartnerAccessEntity;
  },
  findBy: async (arg) => {
    return [{ ...mockPartnerAccessEntity, ...(arg ? { ...arg } : {}) }] as PartnerAccessEntity[];
  },
  find: async () => {
    return [{ ...mockPartnerAccessEntity }] as PartnerAccessEntity[];
  },
  save: async (arg) => arg as PartnerAccessEntity,
};

export const mockPartnerRepositoryMethods: PartialFuncReturn<Repository<PartnerEntity>> = {
  create: (dto) => {
    return {
      ...mockPartnerEntity,
      ...dto,
    } as PartnerEntity;
  },
  findOneBy: async (arg) => {
    return { ...mockPartnerEntity, ...(arg ? { ...arg } : {}) } as PartnerEntity;
  },
  find: async (arg) => {
    return [{ ...mockPartnerEntity, ...(arg ? { ...arg } : {}) }] as PartnerEntity[];
  },
  findBy: async (arg) => {
    return [{ ...mockPartnerEntity, ...(arg ? { ...arg } : {}) }] as PartnerEntity[];
  },
  save: async (arg) => arg as PartnerEntity,
};

export const mockPartnerFeatureRepositoryMethods: PartialFuncReturn<
  Repository<PartnerFeatureEntity>
> = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto) => {
    return {
      ...mockPartnerFeatureEntity,
      ...dto,
    } as PartnerFeatureEntity;
  },
  findOneBy: async (arg) => {
    return { ...mockPartnerFeatureEntity, ...(arg ? { ...arg } : {}) } as PartnerFeatureEntity;
  },
  findBy: async (arg) => {
    return [{ ...mockPartnerFeatureEntity, ...(arg ? { ...arg } : {}) }] as PartnerFeatureEntity[];
  },
  save: async (arg) => arg as PartnerFeatureEntity,
};

export const mockFeatureRepositoryMethods: PartialFuncReturn<Repository<FeatureEntity>> = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto) => {
    return {
      ...mockFeatureEntity,
      ...dto,
    } as FeatureEntity;
  },
  findOneBy: async (arg) => {
    return { ...mockFeatureEntity, ...(arg ? { ...arg } : {}) } as FeatureEntity;
  },
  find: async (arg) => {
    return [{ ...mockFeatureEntity, ...(arg ? { ...arg } : {}) }] as FeatureEntity[];
  },
  findBy: async (arg) => {
    return [{ ...mockFeatureEntity, ...(arg ? { ...arg } : {}) }] as FeatureEntity[];
  },
  save: async (arg) => arg as FeatureEntity,
};

export const mockEventLoggerServiceMethods: PartialFuncReturn<EventLoggerService> = {
  createEventLog: async ({ userId, event, date }) => {
    return { userId, event, date, id: 'eventLogId1ß' } as EventLogEntity;
  },
};

export const mockEventLoggerRepositoryMethods: PartialFuncReturn<Repository<EventLogEntity>> = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto) => {
    return {
      ...mockEventLog,
      ...dto,
      id: 'newId',
    } as EventLogEntity;
  },
  save: async (dto) => {
    return {
      ...mockEventLog,
      ...dto,
      id: 'logId',
    } as EventLogEntity;
  },
  findOneBy: async (arg) => {
    return { ...mockEventLog, ...(arg ? { ...arg } : {}) } as EventLogEntity;
  },
  find: async (arg) => {
    return [{ ...mockEventLog, ...(arg ? { ...arg } : {}) }] as EventLogEntity[];
  },
  findBy: async (arg) => {
    return [{ ...mockEventLog, ...(arg ? { ...arg } : {}) }] as EventLogEntity[];
  },
};

export const mockSubscriptionUserRepositoryMethods: PartialFuncReturn<
  Repository<SubscriptionUserEntity>
> = {
  createQueryBuilder: createQueryBuilderMock({
    getOne: jest.fn().mockResolvedValue(mockSubscriptionUserEntity),
  }),
  create: (dto) => {
    return {
      ...mockSubscriptionUserEntity,
      ...dto,
      id: 'newId',
    } as SubscriptionUserEntity;
  },
  findOneBy: async (arg) => {
    return {
      ...mockSubscriptionUserEntity,
      ...(arg ? { ...arg } : {}),
    } as SubscriptionUserEntity;
  },
  findOne: async (arg) => {
    return {
      ...mockSubscriptionUserEntity,
      ...(arg ? { ...arg } : {}),
    } as SubscriptionUserEntity;
  },
  find: async (arg) => {
    return [
      { ...mockSubscriptionUserEntity, ...(arg ? { ...arg } : {}) },
    ] as SubscriptionUserEntity[];
  },
  findBy: async (arg) => {
    return [
      { ...mockSubscriptionUserEntity, ...(arg ? { ...arg } : {}) },
    ] as SubscriptionUserEntity[];
  },
  save: async (arg) => arg as SubscriptionUserEntity,
};

export const mockZapierWebhookClientMethods = {} as ZapierWebhookClient;
