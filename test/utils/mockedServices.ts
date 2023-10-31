import { PartialFuncReturn } from '@golevelup/ts-jest';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { MailchimpClient } from 'src/api/mailchimp/mailchip-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CourseRepository } from 'src/course/course.repository';
import { CourseEntity } from 'src/entities/course.entity';
import { EmailCampaignEntity } from 'src/entities/email-campaign.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { FeatureEntity } from 'src/entities/feature.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerRepository } from 'src/event-logger/event-logger.repository';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { FeatureRepository } from 'src/feature/feature.repository';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerFeatureRepository } from 'src/partner-feature/partner-feature.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { SessionRepository } from 'src/session/session.repository';
import { CreateUserDto } from 'src/user/dtos/create-user.dto';
import { UpdateUserDto } from 'src/user/dtos/update-user.dto';
import { UserRepository } from 'src/user/user.repository';
import { EmailCampaignRepository } from 'src/webhooks/email-campaign/email-campaign.repository';
import { TherapySessionRepository } from 'src/webhooks/therapy-session.repository';
import { WebhooksService } from 'src/webhooks/webhooks.service';
import {
  mockCourse,
  mockEmailCampaignEntity,
  mockEventLog,
  mockFeatureEntity,
  mockPartnerAccessEntity,
  mockPartnerAccessEntityBase,
  mockPartnerEntity,
  mockPartnerFeatureEntity,
  mockSession,
  mockTherapySessionEntity,
  mockUserEntity,
  mockUserRecord,
  partnerAccessArray,
} from './mockData';
import { createQueryBuilderMock } from './mockUtils';

export const mockSessionRepositoryMethods: PartialFuncReturn<SessionRepository> = {
  findOne: async () => {
    return mockSession;
  },
  save: async (entity) => {
    return entity as SessionEntity;
  },
  create: () => {
    return mockSession;
  },
};

export const mockCourseRepositoryMethods: PartialFuncReturn<CourseRepository> = {
  findOne: async () => {
    return mockCourse;
  },
  create: () => {
    return mockCourse;
  },
  save: async (entity) => {
    return entity as CourseEntity;
  },
};

export const mockCoursePartnerRepositoryMethods: PartialFuncReturn<CoursePartnerService> = {
  updateCoursePartners: async () => {
    return [];
  },
};
export const mockTherapySessionRepositoryMethods: PartialFuncReturn<TherapySessionRepository> = {
  findOne: async (arg) => {
    return { ...mockTherapySessionEntity, ...(arg ? arg : {}) } as TherapySessionEntity;
  },
  findOneOrFail: async (arg) => {
    return { ...mockTherapySessionEntity, ...(arg ? arg : {}) } as TherapySessionEntity;
  },
  save: async (arg) => arg as TherapySessionEntity,
};

export const mockUserRepositoryMethods: PartialFuncReturn<UserRepository> = {
  create: (dto: CreateUserDto) => {
    return {
      ...mockUserEntity,
      ...dto,
    } as UserEntity;
  },
  findOne: async ({ email: client_email }) => {
    return { ...mockUserEntity, ...(client_email ? { email: client_email } : {}) } as UserEntity;
  },
  find: async () => {
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
  findOne: ({ email: client_email }) => {
    return { ...mockUserEntity, ...(client_email ? { email: client_email } : {}) };
  },
  save: (arg) => arg,
};

export const mockPartnerAccessRepositoryMethods: PartialFuncReturn<PartnerAccessRepository> = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto) => {
    return {
      ...mockPartnerAccessEntityBase,
      ...dto,
    };
  },
  findOne: async (arg) => {
    return { ...mockPartnerAccessEntity, ...(arg ? { ...arg } : {}) } as PartnerAccessEntity;
  },
  find: async (arg) => {
    return [
      ...partnerAccessArray,
      { ...mockPartnerAccessEntity, ...(arg ? { ...arg } : {}) },
    ] as PartnerAccessEntity[];
  },
  save: async (arg) => arg as PartnerAccessEntity,
};

export const mockPartnerRepositoryMethods: PartialFuncReturn<PartnerRepository> = {
  create: (dto) => {
    return {
      ...mockPartnerEntity,
      ...dto,
    } as PartnerEntity;
  },
  findOne: async (arg) => {
    return { ...mockPartnerEntity, ...(arg ? { ...arg } : {}) } as PartnerEntity;
  },
  find: async (arg) => {
    return [{ ...mockPartnerEntity, ...(arg ? { ...arg } : {}) }] as PartnerEntity[];
  },
  save: async (arg) => arg as PartnerEntity,
};

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

export const mockMailchimpClientMethods: PartialFuncReturn<MailchimpClient> = {
  sendTherapyFeedbackEmail: async () => {
    return [];
  },
  sendImpactMeasurementEmail: async () => {
    return [];
  },
};

export const mockEmailCampaignRepositoryMethods: PartialFuncReturn<EmailCampaignRepository> = {
  find: async (arg) => {
    return [{ ...mockEmailCampaignEntity, ...(arg ? arg : {}) }] as EmailCampaignEntity[];
  },
  save: async (arg) => arg as EmailCampaignEntity,
};

export const mockPartnerServiceMethods = {
  getPartnerById: async (arg): Promise<PartnerEntity> => {
    return { ...mockPartnerEntity, id: arg };
  },
  getPartnerWithPartnerFeaturesById: async (arg): Promise<PartnerEntity> => {
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

export const mockPartnerFeatureRepositoryMethods: PartialFuncReturn<PartnerFeatureRepository> = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto) => {
    return {
      ...mockPartnerFeatureEntity,
      ...dto,
    } as PartnerFeatureEntity;
  },
  findOne: async (arg) => {
    return { ...mockPartnerFeatureEntity, ...(arg ? { ...arg } : {}) } as PartnerFeatureEntity;
  },
  find: async (arg) => {
    return [{ ...mockPartnerFeatureEntity, ...(arg ? { ...arg } : {}) }] as PartnerFeatureEntity[];
  },
  save: async (arg) => arg as PartnerFeatureEntity,
};
export const mockFeatureRepositoryMethods: PartialFuncReturn<FeatureRepository> = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto) => {
    return {
      ...mockFeatureEntity,
      ...dto,
    } as FeatureEntity;
  },
  findOne: async (arg) => {
    return { ...mockFeatureEntity, ...(arg ? { ...arg } : {}) } as FeatureEntity;
  },
  find: async (arg) => {
    return [{ ...mockFeatureEntity, ...(arg ? { ...arg } : {}) }] as FeatureEntity[];
  },
  save: async (arg) => arg as FeatureEntity,
};

export const mockEventLoggerServiceMethods: PartialFuncReturn<EventLoggerService> = {
  createEventLog: async ({ userId, event, date }) => {
    return { userId, event, date, id: 'eventLogId1ß' } as EventLogEntity;
  },
};

export const mockEventLoggerRepositoryMethods: PartialFuncReturn<EventLoggerRepository> = {
  createQueryBuilder: createQueryBuilderMock(),
  create: (dto) => {
    return {
      ...mockEventLog,
      ...dto,
      id: 'newId',
    } as EventLogEntity;
  },
  findOne: async (arg) => {
    return { ...mockEventLog, ...(arg ? { ...arg } : {}) } as EventLogEntity;
  },
  find: async (arg) => {
    return [{ ...mockEventLog, ...(arg ? { ...arg } : {}) }] as EventLogEntity[];
  },
  save: async (arg) => arg as EventLogEntity,
};
