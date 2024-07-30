import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createCrispProfile,
  updateCrispProfile,
  updateCrispProfileBase,
} from 'src/api/crisp/crisp-api';
import {
  createMailchimpMergeField,
  createMailchimpProfile,
  updateMailchimpProfile,
} from 'src/api/mailchimp/mailchimp-api';
import { UserEntity } from 'src/entities/user.entity';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import {
  mockAltPartnerAccessEntity,
  mockCourseUserEntity,
  mockPartnerAccessEntity,
  mockPartnerEntity,
  mockUserEntity,
} from 'test/utils/mockData';
import { mockUserRepositoryMethods } from 'test/utils/mockedServices';
import { Repository } from 'typeorm';
import {
  EMAIL_REMINDERS_FREQUENCY,
  SIMPLYBOOK_ACTION_ENUM,
  mailchimpMarketingPermissionId,
} from './constants';

jest.mock('src/api/crisp/crisp-api');
jest.mock('src/api/mailchimp/mailchimp-api');

describe('Service user profiles', () => {
  let service: ServiceUserProfilesService;
  const mockedUserRepository = createMock<Repository<UserEntity>>(mockUserRepositoryMethods);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceUserProfilesService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedUserRepository,
        },
      ],
    }).compile();

    service = module.get<ServiceUserProfilesService>(ServiceUserProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createServiceUserProfiles', () => {
    it('should create crisp and mailchimp profiles for a public user', async () => {
      await service.createServiceUserProfiles(mockUserEntity);

      expect(createCrispProfile).toHaveBeenCalledWith({
        email: mockUserEntity.email,
        person: { nickname: mockUserEntity.name, locales: [mockUserEntity.signUpLanguage] },
        segments: ['public'],
      });

      const createdAt = mockUserEntity.createdAt.toISOString();
      const lastActiveAt = mockUserEntity.lastActiveAt.toISOString();

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
          email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          signed_up_at: createdAt,
          last_active_at: lastActiveAt,
          feature_live_chat: true,
          feature_therapy: false,
          partners: '',
          therapy_sessions_redeemed: 0,
          therapy_sessions_remaining: 0,
        },
        mockUserEntity.email,
      );

      expect(createMailchimpProfile).toHaveBeenCalledWith({
        email_address: mockUserEntity.email,
        language: mockUserEntity.signUpLanguage,
        status: 'subscribed',
        marketing_permissions: [
          {
            marketing_permission_id: mailchimpMarketingPermissionId,
            text: 'Email',
            enabled: mockUserEntity.contactPermission,
          },
        ],
        merge_fields: {
          SIGNUPD: createdAt,
          LACTIVED: lastActiveAt,
          NAME: mockUserEntity.name,
          FEATCHAT: 'true',
          FEATTHER: 'false',
          PARTNERS: '',
          THERREMAIN: 0,
          THERREDEEM: 0,
          REMINDFREQ: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
        },
      });
    });

    it('should create crisp and mailchimp profiles for a partner user', async () => {
      await service.createServiceUserProfiles(
        mockUserEntity,
        mockPartnerEntity,
        mockPartnerAccessEntity,
      );

      const partnerName = mockPartnerEntity.name.toLowerCase();
      const createdAt = mockUserEntity.createdAt.toISOString();
      const lastActiveAt = mockUserEntity.lastActiveAt.toISOString();

      expect(createCrispProfile).toHaveBeenCalledWith({
        email: mockUserEntity.email,
        person: { nickname: mockUserEntity.name, locales: [mockUserEntity.signUpLanguage] },
        segments: [partnerName],
      });

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          signed_up_at: createdAt,
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
          email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          partners: partnerName,
          last_active_at: lastActiveAt,
          feature_live_chat: mockPartnerAccessEntity.featureLiveChat,
          feature_therapy: mockPartnerAccessEntity.featureTherapy,
          therapy_sessions_remaining: mockPartnerAccessEntity.therapySessionsRemaining,
          therapy_sessions_redeemed: mockPartnerAccessEntity.therapySessionsRedeemed,
        },
        mockUserEntity.email,
      );

      expect(createMailchimpProfile).toHaveBeenCalledWith({
        email_address: mockUserEntity.email,
        language: mockUserEntity.signUpLanguage,
        status: 'subscribed',
        marketing_permissions: [
          {
            marketing_permission_id: mailchimpMarketingPermissionId,
            text: 'Email',
            enabled: mockUserEntity.contactPermission,
          },
        ],
        merge_fields: {
          SIGNUPD: mockUserEntity.createdAt.toISOString(),
          LACTIVED: lastActiveAt,
          NAME: mockUserEntity.name,
          PARTNERS: partnerName,
          FEATCHAT: String(mockPartnerAccessEntity.featureLiveChat),
          FEATTHER: String(mockPartnerAccessEntity.featureTherapy),
          THERREMAIN: mockPartnerAccessEntity.therapySessionsRemaining,
          THERREDEEM: mockPartnerAccessEntity.therapySessionsRedeemed,
          REMINDFREQ: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
        },
      });
    });

    it('should not propagate external api call errors', async () => {
      const mocked = jest.mocked(createCrispProfile);
      mocked.mockRejectedValue(new Error('Crisp API call failed'));
      await expect(service.createServiceUserProfiles(mockUserEntity)).resolves.not.toThrow();
      mocked.mockReset();
    });
  });

  describe('updateServiceUserProfilesUser', () => {
    it('should update crisp and mailchimp profile user data', async () => {
      await service.updateServiceUserProfilesUser(mockUserEntity, false, mockUserEntity.email);

      const lastActiveAt = mockUserEntity.lastActiveAt.toISOString();

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
          email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          last_active_at: lastActiveAt,
        },
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          language: mockUserEntity.signUpLanguage,
          status: 'subscribed',
          marketing_permissions: [
            {
              marketing_permission_id: mailchimpMarketingPermissionId,
              text: 'Email',
              enabled: mockUserEntity.contactPermission,
            },
          ],
          merge_fields: {
            NAME: mockUserEntity.name,
            LACTIVED: lastActiveAt,
            REMINDFREQ: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          },
        },
        mockUserEntity.email,
      );
    });

    it('should update crisp and mailchimp profiles contact permissions', async () => {
      const mockUser: UserEntity = {
        ...mockUserEntity,
        contactPermission: false,
        serviceEmailsPermission: false,
      };
      const lastActiveAt = mockUserEntity.lastActiveAt.toISOString();

      await service.updateServiceUserProfilesUser(mockUser, false, mockUser.email);

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          marketing_permission: false,
          service_emails_permission: false,
          last_active_at: lastActiveAt,
          email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
        },
        mockUser.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          language: mockUser.signUpLanguage,
          status: 'unsubscribed',
          marketing_permissions: [
            {
              marketing_permission_id: mailchimpMarketingPermissionId,
              text: 'Email',
              enabled: false,
            },
          ],
          merge_fields: {
            NAME: mockUser.name,
            LACTIVED: lastActiveAt,
            REMINDFREQ: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          },
        },
        mockUser.email,
      );
    });

    it('should additionally call crisp base profile update if required', async () => {
      await service.updateServiceUserProfilesUser(mockUserEntity, true, mockUserEntity.email);

      expect(updateCrispProfile).toHaveBeenCalled();
      expect(updateMailchimpProfile).toHaveBeenCalled();

      expect(updateCrispProfileBase).toHaveBeenCalledWith(
        {
          person: {
            nickname: mockUserEntity.name,
            locales: [mockUserEntity.signUpLanguage],
          },
        },
        mockUserEntity.email,
      );
    });

    it('should not propagate external api call errors', async () => {
      const mocked = jest.mocked(updateMailchimpProfile);
      mocked.mockRejectedValue(new Error('Mailchimp API call failed'));
      await expect(
        service.updateServiceUserProfilesUser(mockUserEntity, false, mockUserEntity.email),
      ).resolves.not.toThrow();
      mocked.mockReset();
    });
  });

  describe('updateServiceUserProfilesPartnerAccess', () => {
    it('should update crisp and mailchimp profile partner access data', async () => {
      await service.updateServiceUserProfilesPartnerAccess(
        [mockPartnerAccessEntity],
        mockUserEntity.email,
      );

      const partnerString = mockPartnerAccessEntity.partner.name.toLowerCase();

      expect(updateCrispProfileBase).toHaveBeenCalledWith(
        {
          segments: [partnerString],
        },
        mockUserEntity.email,
      );

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          partners: partnerString,
          feature_live_chat: mockPartnerAccessEntity.featureLiveChat,
          feature_therapy: mockPartnerAccessEntity.featureTherapy,
          therapy_sessions_remaining: mockPartnerAccessEntity.therapySessionsRemaining,
          therapy_sessions_redeemed: mockPartnerAccessEntity.therapySessionsRedeemed,
        },
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          merge_fields: {
            PARTNERS: partnerString,
            FEATCHAT: String(mockPartnerAccessEntity.featureLiveChat),
            FEATTHER: String(mockPartnerAccessEntity.featureTherapy),
            THERREMAIN: mockPartnerAccessEntity.therapySessionsRemaining,
            THERREDEEM: mockPartnerAccessEntity.therapySessionsRedeemed,
          },
        },
        mockUserEntity.email,
      );
    });

    it('should update crisp and mailchimp profile multiple partner accesses data', async () => {
      const partnerAccesses = [mockPartnerAccessEntity, mockAltPartnerAccessEntity];
      await service.updateServiceUserProfilesPartnerAccess(partnerAccesses, mockUserEntity.email);

      const partnerString = service.serializePartnersString(partnerAccesses);

      expect(updateCrispProfileBase).toHaveBeenCalledWith(
        {
          segments: partnerString.split('; '),
        },
        mockUserEntity.email,
      );

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          partners: partnerString,
          feature_live_chat: true,
          feature_therapy: true,
          therapy_sessions_remaining: 9,
          therapy_sessions_redeemed: 3,
        },
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          merge_fields: {
            PARTNERS: partnerString,
            FEATCHAT: 'true',
            FEATTHER: 'true',
            THERREMAIN: 9,
            THERREDEEM: 3,
          },
        },
        mockUserEntity.email,
      );
    });

    it('should not propagate external api call errors', async () => {
      const mocked = jest.mocked(updateCrispProfile);
      mocked.mockRejectedValue(new Error('Crisp API call failed'));
      await expect(
        service.updateServiceUserProfilesPartnerAccess(
          [mockPartnerAccessEntity],
          mockUserEntity.email,
        ),
      ).resolves.not.toThrow();
      mocked.mockReset();
    });
  });

  describe('updateServiceUserProfilesTherapy', () => {
    it('should update crisp and mailchimp profile for first therapy booking', async () => {
      const therapySession = mockAltPartnerAccessEntity.therapySession[1];
      const partnerAccesses = [
        {
          ...mockAltPartnerAccessEntity,
          therapySessionsRemaining: 5,
          therapySessionsRedeemed: 1,
          therapySession: [therapySession],
        },
      ];

      await service.updateServiceUserProfilesTherapy(partnerAccesses, mockUserEntity.email);

      const firstTherapySessionAt = therapySession.startDateTime.toISOString();
      const nextTherapySessionAt = therapySession.startDateTime.toISOString();
      const lastTherapySessionAt = '';

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          therapy_sessions_remaining: 5,
          therapy_sessions_redeemed: 1,
          therapy_session_first_at: firstTherapySessionAt,
          therapy_session_next_at: nextTherapySessionAt,
          therapy_session_last_at: lastTherapySessionAt,
        },
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          merge_fields: {
            THERREMAIN: 5,
            THERREDEEM: 1,
            THERFIRSAT: firstTherapySessionAt,
            THERNEXTAT: nextTherapySessionAt,
            THERLASTAT: lastTherapySessionAt,
          },
        },
        mockUserEntity.email,
      );
    });

    it('should update crisp and mailchimp profile combined therapy data for new booking', async () => {
      const partnerAccesses = [mockPartnerAccessEntity, mockAltPartnerAccessEntity];

      await service.updateServiceUserProfilesTherapy(partnerAccesses, mockUserEntity.email);

      const firstTherapySessionAt =
        mockPartnerAccessEntity.therapySession[0].startDateTime.toISOString();
      const nextTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[1].startDateTime.toISOString();
      const lastTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[0].startDateTime.toISOString();

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          therapy_sessions_remaining: 9,
          therapy_sessions_redeemed: 3,
          therapy_session_first_at: firstTherapySessionAt,
          therapy_session_next_at: nextTherapySessionAt,
          therapy_session_last_at: lastTherapySessionAt,
        },
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          merge_fields: {
            THERREMAIN: 9,
            THERREDEEM: 3,
            THERFIRSAT: firstTherapySessionAt,
            THERNEXTAT: nextTherapySessionAt,
            THERLASTAT: lastTherapySessionAt,
          },
        },
        mockUserEntity.email,
      );
    });

    it('should update crisp and mailchimp profile combined therapy data for updated booking', async () => {
      const partnerAccesses = [mockPartnerAccessEntity, mockAltPartnerAccessEntity];

      await service.updateServiceUserProfilesTherapy(partnerAccesses, mockUserEntity.email);

      const firstTherapySessionAt =
        mockPartnerAccessEntity.therapySession[0].startDateTime.toISOString();
      const nextTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[1].startDateTime.toISOString();
      const lastTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[0].startDateTime.toISOString();

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          therapy_sessions_remaining: 9,
          therapy_sessions_redeemed: 3,
          therapy_session_first_at: firstTherapySessionAt,
          therapy_session_next_at: nextTherapySessionAt,
          therapy_session_last_at: lastTherapySessionAt,
        },
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          merge_fields: {
            THERREMAIN: 9,
            THERREDEEM: 3,
            THERFIRSAT: firstTherapySessionAt,
            THERNEXTAT: nextTherapySessionAt,
            THERLASTAT: lastTherapySessionAt,
          },
        },
        mockUserEntity.email,
      );
    });

    it('should update crisp and mailchimp profile combined therapy data for cancelled booking', async () => {
      mockAltPartnerAccessEntity.therapySession[1].action =
        SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING;
      const partnerAccesses = [mockPartnerAccessEntity, mockAltPartnerAccessEntity];

      await service.updateServiceUserProfilesTherapy(partnerAccesses, mockUserEntity.email);

      const firstTherapySessionAt =
        mockPartnerAccessEntity.therapySession[0].startDateTime.toISOString();
      const lastTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[0].startDateTime.toISOString();

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          therapy_sessions_remaining: 9,
          therapy_sessions_redeemed: 3,
          therapy_session_first_at: firstTherapySessionAt,
          therapy_session_next_at: '',
          therapy_session_last_at: lastTherapySessionAt,
        },
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          merge_fields: {
            THERREMAIN: 9,
            THERREDEEM: 3,
            THERFIRSAT: firstTherapySessionAt,
            THERNEXTAT: '',
            THERLASTAT: lastTherapySessionAt,
          },
        },
        mockUserEntity.email,
      );
    });

    it('should not propagate external api call errors', async () => {
      const mocked = jest.mocked(updateMailchimpProfile);
      mocked.mockRejectedValue(new Error('Mailchimp API call failed'));
      await expect(
        service.updateServiceUserProfilesTherapy(
          [mockPartnerAccessEntity, mockAltPartnerAccessEntity],
          mockUserEntity.email,
        ),
      ).resolves.not.toThrow();
      mocked.mockReset();
    });
  });

  describe('updateServiceUserProfilesCourse', () => {
    it('should update crisp and mailchimp profile course data', async () => {
      await service.updateServiceUserProfilesCourse(mockCourseUserEntity, mockUserEntity.email);

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          course_cn: 'Started',
          course_cn_sessions: 'WAB:C',
        },
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        {
          merge_fields: {
            C_CN: 'Started',
            C_CN_S: 'WAB:C',
          },
        },
        mockUserEntity.email,
      );
    });

    it('should not propagate external api call errors', async () => {
      const mocked = jest.mocked(updateCrispProfile);
      mocked.mockRejectedValue(new Error('Crisp API call failed'));
      await expect(
        service.updateServiceUserProfilesCourse(mockCourseUserEntity, mockUserEntity.email),
      ).resolves.not.toThrow();
      mocked.mockReset();
    });
  });

  describe('createMailchimpCourseMergeField', () => {
    it('should create mailchimp course merge field', async () => {
      await service.createMailchimpCourseMergeField('Full course name');

      expect(createMailchimpMergeField).toHaveBeenNthCalledWith(
        1,
        'Course FCN Status',
        'C_FCN',
        'text',
      );
      expect(createMailchimpMergeField).toHaveBeenNthCalledWith(
        2,
        'Course FCN Sessions',
        'C_FCN_S',
        'text',
      );
    });
  });
  describe('updateServiceUserEmailAndProfiles', () => {
    it("should update the user's email in crisp and mailchimp", async () => {
      const oldEmail = mockUserEntity.email;
      const newEmail = 'newemail@test.com';
      await service.updateServiceUserEmailAndProfiles(
        { ...mockUserEntity, email: newEmail },
        oldEmail,
      );
      const serialisedMockUserData = service.serializeUserData(mockUserEntity);
      expect(updateCrispProfileBase).toHaveBeenCalledWith(
        { email: newEmail, person: { locales: ['en'], nickname: 'name' } },
        oldEmail,
      );
      expect(updateCrispProfile).toHaveBeenCalledWith(
        { ...serialisedMockUserData.crispSchema },
        newEmail,
      );
      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        { ...serialisedMockUserData.mailchimpSchema, email_address: newEmail },
        oldEmail,
      );
    });
    it('should not throw if request to Mailchimp API call fails', async () => {
      const mocked = jest.mocked(updateMailchimpProfile);
      mocked.mockRejectedValue(new Error('Mailchimp API call failed'));
      const oldEmail = mockUserEntity.email;
      const newEmail = 'newemail@test.com';

      await expect(
        service.updateServiceUserEmailAndProfiles({ ...mockUserEntity, email: newEmail }, oldEmail),
      ).resolves.not.toThrow();
      mocked.mockReset();
    });
    it('should not throw if request to Crisp API call  fails', async () => {
      const mocked = jest.mocked(updateCrispProfileBase);
      mocked.mockRejectedValue(new Error('Crisp API call failed'));
      const oldEmail = mockUserEntity.email;
      const newEmail = 'newemail@test.com';
      await expect(
        service.updateServiceUserEmailAndProfiles({ ...mockUserEntity, email: newEmail }, oldEmail),
      ).resolves.not.toThrow();
      mocked.mockReset();
    });
  });
});
