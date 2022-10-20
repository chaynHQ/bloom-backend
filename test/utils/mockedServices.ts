import { PartialFuncReturn } from '@golevelup/ts-jest';
import { MailchimpClient } from 'src/api/mailchimp/mailchip-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CourseRepository } from 'src/course/course.repository';
import { CourseEntity } from 'src/entities/course.entity';
import { EmailCampaignEntity } from 'src/entities/email-campaign.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
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
  mockPartnerAccessEntity,
  mockSession,
  mockTherapySessionEntity,
  mockUserEntity,
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
  create: (dto) => {
    return {
      ...mockPartnerAccessEntity,
      ...dto,
    } as PartnerAccessEntity;
  },
  findOne: async (arg) => {
    return { ...mockPartnerAccessEntity, ...(arg ? { ...arg } : {}) } as PartnerAccessEntity;
  },
  find: async (arg) => {
    return [{ ...mockPartnerAccessEntity, ...(arg ? { ...arg } : {}) }] as PartnerAccessEntity[];
  },
  save: async (arg) => arg as PartnerAccessEntity,
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
};

export const mockEmailCampaignRepositoryMethods: PartialFuncReturn<EmailCampaignRepository> = {
  find: async (arg) => {
    return [{ ...mockEmailCampaignEntity, ...(arg ? arg : {}) }] as EmailCampaignEntity[];
  },
  save: async (arg) => arg as EmailCampaignEntity,
};
