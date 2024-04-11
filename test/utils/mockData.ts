import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { CoursePartnerEntity } from 'src/entities/course-partner.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { EmailCampaignEntity } from 'src/entities/email-campaign.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { FeatureEntity } from 'src/entities/feature.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { ZapierSimplybookBodyDto } from 'src/partner-access/dtos/zapier-body.dto';
import {
  CAMPAIGN_TYPE,
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_STORY_STATUS_ENUM,
} from 'src/utils/constants';
import { ISbResult } from 'storyblok-js-client';

export const mockSessionStoryblokResult = {
  data: {
    story: {
      name: 'What are boundaries?',
      created_at: '2022-05-05T11:28:07.941Z',
      published_at: '2022-05-05T11:28:37.572Z',
      id: 123456,
      uuid: 'sessionStoryblokUuid1',
      content: {
        _uid: 'courseUuid',
        name: 'What are boundaries?',
        bonus: '',
        video: { id: '', url: '', linktype: 'story', fieldtype: 'multilink', cached_url: '' },
        course: 'courseUuid1',
        activity: '',
        component: 'Session',
        coming_soon: true,
        description:
          'In this session we start to define what boundaries are, explore why boundaries are so important, and reflect on what boundary violations can mean.',
      },
      slug: 'what-are-boundaries',
      full_slug: 'courses/creating-boundaries/what-are-boundaries',
    },
  },
  perPage: 1,
  total: 1,
  headers: undefined,
} as ISbResult;

export const mockCourseStoryblokResult = {
  data: {
    story: {
      name: 'Overview',
      created_at: '2022-05-05T11:29:10.888Z',
      published_at: '2022-05-19T16:32:44.502Z',
      id: 5678,
      uuid: 'courseUuid1',
      content: {
        _uid: '12345',
        name: 'Recovering from toxic and abusive relationships',
        video: { id: '', url: '', linktype: 'story', fieldtype: 'multilink', cached_url: '' },
        weeks: [],
        component: 'Course',
        coming_soon: true,
        description:
          'Abuse can happen to anyone - and it’s never the survivor’s fault. In this course, we discuss abusive tactics, the cycle of coercive control, the science of trauma, and how abuse can affect our boundaries, relationships, and coping mechanisms. We empower ourselves to build positive self-esteem with tools such as journaling, somatic practice, and community.',
      },
      slug: 'recovering-from-toxic-and-abusive-relationships',
      full_slug: 'courses/recovering-from-toxic-and-abusive-relationships/',
    },
  },
  perPage: 1,
  total: 1,
  headers: undefined,
} as ISbResult;

export const mockCourse: CourseEntity = {
  coursePartner: [],
  courseUser: [],
  id: 'courseId1',
  storyblokId: 123456,
  storyblokUuid: 'courseUuid1',
  slug: '/slug/slug',
  status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
  name: 'course name',
  createdAt: new Date(100),
  updatedAt: new Date(100),
  session: [],
};

export const mockSession: SessionEntity = {
  sessionUser: [],
  id: 'sessionId1',
  storyblokId: 123456,
  storyblokUuid: 'sessionStoryblokUuid1',
  slug: 'courses/creating-boundaries/what-are-boundaries',
  status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
  name: 'What are boundaries?',
  createdAt: new Date(100),
  updatedAt: new Date(100),
  courseId: 'courseId1',
  course: { ...mockCourse },
};

export const mockIFirebaseUser: IFirebaseUser = {
  iss: '',
  aud: '',
  auth_time: 1,
  user_id: '',
  sub: '',
  iat: 1,
  exp: 1,
  email: '',
  email_verified: true,
  firebase: {
    identities: {
      email: [],
    },
    sign_in_provider: '',
  },
  uid: '',
};

export const mockUserEntity: UserEntity = {
  id: 'userId1',
  isSuperAdmin: false,
  isActive: true,
  createdAt: new Date(),
  partnerAccess: [],
  partnerAdmin: null,
  courseUser: [],
  updatedAt: new Date(),
  crispTokenId: '123',
  firebaseUid: '123',
  contactPermission: true,
  serviceEmailsPermission: true,
  email: 'user@email.com',
  name: 'name',
  signUpLanguage: 'en',
  subscriptionUser: [],
  therapySession: [],
  eventLog: [],
};

export const mockTherapySessionEntity = {
  action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
  createdAt: new Date(),
  partnerAccessId: 'pa1',
  partnerAccess: { id: 'pa1' } as PartnerAccessEntity,
  updatedAt: new Date(),
  serviceName: 'bloom therapy',
  serviceProviderEmail: 'therapist@test.com',
  serviceProviderName: 'Therapist name',
  bookingCode: '123',
  clientTimezone: 'Europe/London',
  clientEmail: 'client@test.com',
  startDateTime: new Date('2022-09-12T07:30:00+0100'),
  endDateTime: new Date('2022-09-12T08:30:00+0100'),
  cancelledAt: null,
  rescheduledFrom: null,
  completedAt: null,
  id: 'ts1',
  userId: 'userId1',
  user: { signUpLanguage: 'en' } as UserEntity,
} as TherapySessionEntity;

export const mockSimplybookBodyBase: ZapierSimplybookBodyDto = {
  action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
  start_date_time: '2022-09-12T07:30:00+0000',
  end_date_time: '2022-09-12T08:30:00+0000',
  client_email: 'testuser@test.com',
  user_id: 'userId2',
  client_timezone: 'Europe/London',
  booking_code: 'abc',
  service_name: 'bloom therapy',
  service_provider_email: 'therapist@test.com',
  service_provider_name: 'Therapist name',
};

export const mockPartnerEntity = {
  name: 'Bumble',
  id: 'partnerId',
  partnerFeature: [],
} as PartnerEntity;

export const mockPartnerAccessEntityBase = {
  id: 'randomId',
  userId: null,
  partnerId: '',
  partnerAdminId: null,
  user: null,
  partnerAdmin: null,
  partner: null,
  active: false,
  activatedAt: null,
  accessCode: null,
  createdAt: new Date(),
  therapySession: [],
  updatedAt: null,
};

export const mockPartnerAccessEntity = {
  id: 'pa1',
  therapySessionsRemaining: 5,
  therapySessionsRedeemed: 1,
  featureTherapy: true,
  featureLiveChat: true,
  accessCode: '123456',
  partner: mockPartnerEntity,
  partnerAdmin: null,
  partnerAdminId: null,
  createdAt: new Date(),
  activatedAt: new Date(),
  therapySession: [],
  updatedAt: new Date(),
  active: true,
  userId: null,
} as PartnerAccessEntity;

export const mockCoursePartnerEntity: CoursePartnerEntity = {
  id: 'coursePartnerId',
  partnerId: mockPartnerEntity.id,
  partner: mockPartnerEntity,
  courseId: mockCourse.id,
  course: { ...mockCourse },
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockEmailCampaignEntity: EmailCampaignEntity = {
  email: 'test@test.com',
  emailSentDateTime: new Date(),
  id: 'id',
  createdAt: new Date(),
  updatedAt: new Date(),
  campaignType: CAMPAIGN_TYPE.THERAPY_FEEDBACK,
};

export const mockPartnerAdminEntity: PartnerAdminEntity = {
  id: 'paid',
  userId: mockUserEntity.id,
  user: mockUserEntity,
  partner: mockPartnerEntity,
  partnerId: mockPartnerEntity.id,
  partnerAccess: [mockPartnerAccessEntity],
  createdAt: new Date(),
  updatedAt: new Date(),
  active: true,
};

export const mockFeatureEntity = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: 'featureId',
  name: 'Test feature',
  partnerFeature: {},
} as FeatureEntity;

export const mockPartnerFeatureEntity = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: 'partnerFeatureId',
  partnerId: mockPartnerEntity.id,
  feature: mockFeatureEntity,
  featureId: mockFeatureEntity.id,
  active: true,
} as PartnerFeatureEntity;

export const mockUserRecord = {
  uid: 'FirebaseUuid',
} as UserRecord;

export const partnerAccessArray = Array.from(
  [
    mockPartnerAccessEntity,
    mockPartnerAccessEntity,
    mockPartnerAccessEntity,
    mockPartnerAccessEntity,
  ],
  (x, index) => ({ ...mockPartnerAccessEntity, accessCode: x.accessCode + index }),
);

export const mockEventLog: EventLogEntity = {
  event: EVENT_NAME.CHAT_MESSAGE_SENT,
  date: new Date(2000, 1, 1),
  userId: '123',
} as EventLogEntity;
