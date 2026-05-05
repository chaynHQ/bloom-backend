import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createMailchimpMergeField,
  createMailchimpProfile,
  updateMailchimpProfile,
} from 'src/api/mailchimp/mailchimp-api';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatService } from 'src/front-chat/front-chat.service';
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
} from '../utils/constants';

jest.mock('src/api/mailchimp/mailchimp-api');
const mockFrontChatServiceMethods = {
  getOrCreateChatUser: jest.fn().mockResolvedValue({}),
  addChannelHandle: jest.fn().mockResolvedValue(undefined),
};

describe('Service user profiles', () => {
  let service: ServiceUserProfilesService;
  const mockedUserRepository = createMock<Repository<UserEntity>>(mockUserRepositoryMethods);
  const mockFrontChatService = createMock<FrontChatService>(mockFrontChatServiceMethods);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceUserProfilesService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedUserRepository,
        },
        { provide: FrontChatService, useValue: mockFrontChatService },
      ],
    }).compile();

    service = module.get<ServiceUserProfilesService>(ServiceUserProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createServiceUserProfiles', () => {
    const therapyTimestamps = {
      therapy_session_first_at: '',
      therapy_session_next_at: '',
      therapy_session_last_at: '',
    };

    it('should create Front Chat and mailchimp profiles for a public user', async () => {
      await service.createServiceUserProfiles(mockUserEntity);

      const createdAt = mockUserEntity.createdAt.toISOString();
      const lastActiveAt = mockUserEntity.lastActiveAt.toISOString();

      // Single createContact call with all custom fields — no separate updateContactCustomFields
      expect(mockFrontChatService.createContact).toHaveBeenCalledWith({
        email: mockUserEntity.email,
        name: mockUserEntity.name,
        userId: mockUserEntity.id,
        customFields: {
          signed_up_at: createdAt,
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
          email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          last_active_at: lastActiveAt,
          feature_live_chat: true,
          feature_therapy: false,
          partners: '',
          therapy_sessions_redeemed: 0,
          therapy_sessions_remaining: 0,
          ...therapyTimestamps,
        },
      });
      expect(mockFrontChatService.updateContactCustomFields).not.toHaveBeenCalled();

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

    it('should create Front Chat and mailchimp profiles for a partner user', async () => {
      await service.createServiceUserProfiles(
        mockUserEntity,
        mockPartnerEntity,
        mockPartnerAccessEntity,
      );

      const partnerName = mockPartnerEntity.name.toLowerCase();
      const createdAt = mockUserEntity.createdAt.toISOString();
      const lastActiveAt = mockUserEntity.lastActiveAt.toISOString();

      // mockPartnerAccessEntity has one past therapy session (2022-09-12T06:30:00.000Z)
      const therapySessionAt = new Date('2022-09-12T07:30:00+0100').toISOString();

      expect(mockFrontChatService.createContact).toHaveBeenCalledWith({
        email: mockUserEntity.email,
        name: mockUserEntity.name,
        userId: mockUserEntity.id,
        customFields: {
          signed_up_at: createdAt,
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
          email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          last_active_at: lastActiveAt,
          partners: partnerName,
          feature_live_chat: mockPartnerAccessEntity.featureLiveChat,
          feature_therapy: mockPartnerAccessEntity.featureTherapy,
          therapy_sessions_remaining: mockPartnerAccessEntity.therapySessionsRemaining,
          therapy_sessions_redeemed: mockPartnerAccessEntity.therapySessionsRedeemed,
          therapy_session_first_at: therapySessionAt,
          therapy_session_last_at: therapySessionAt,
          therapy_session_next_at: '',
        },
      });
      expect(mockFrontChatService.updateContactCustomFields).not.toHaveBeenCalled();

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
      const mocked = jest.mocked(mockFrontChatService.createContact);
      mocked.mockRejectedValue(new Error('Front Chat API call failed'));
      await expect(service.createServiceUserProfiles(mockUserEntity)).resolves.not.toThrow();
      mocked.mockReset();
    });

    it('should still create mailchimp profile when Front Chat fails', async () => {
      const mocked = jest.mocked(mockFrontChatService.createContact);
      mocked.mockRejectedValue(new Error('Front Chat API call failed'));

      await service.createServiceUserProfiles(mockUserEntity);

      expect(createMailchimpProfile).toHaveBeenCalled();
      mocked.mockReset();
    });
  });

  describe('getOrCreateFrontContact', () => {
    // mockUserEntity has empty partnerAccess/courseUser, so therapy timestamps are ''
    const expectedCustomFields = {
      signed_up_at: mockUserEntity.createdAt.toISOString(),
      marketing_permission: mockUserEntity.contactPermission,
      service_emails_permission: mockUserEntity.serviceEmailsPermission,
      email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
      last_active_at: mockUserEntity.lastActiveAt.toISOString(),
      feature_live_chat: true,
      feature_therapy: false,
      partners: '',
      therapy_sessions_redeemed: 0,
      therapy_sessions_remaining: 0,
      therapy_session_first_at: '',
      therapy_session_next_at: '',
      therapy_session_last_at: '',
    };

    it('creates contact with custom fields when contact does not yet exist', async () => {
      jest.mocked(mockFrontChatService.contactExists).mockResolvedValue(false);
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: [],
        courseUser: [],
      } as any);

      await service.getOrCreateFrontContact(mockUserEntity);

      expect(mockFrontChatService.createContact).toHaveBeenCalledWith({
        email: mockUserEntity.email,
        name: mockUserEntity.name,
        customFields: expectedCustomFields,
        userId: mockUserEntity.id,
      });
      expect(mockFrontChatService.updateContactCustomFields).not.toHaveBeenCalled();
    });

    it('only calls addChannelHandle (not updateContactCustomFields) when contact already exists', async () => {
      jest.mocked(mockFrontChatService.contactExists).mockResolvedValue(true);

      await service.getOrCreateFrontContact(mockUserEntity);
      await new Promise((r) => setImmediate(r));

      expect(mockFrontChatService.createContact).not.toHaveBeenCalled();
      expect(mockFrontChatService.updateContactCustomFields).not.toHaveBeenCalled();
      expect(mockFrontChatService.addChannelHandle).toHaveBeenCalledWith(mockUserEntity.email);
    });

    it('skips for Cypress test emails', async () => {
      await service.getOrCreateFrontContact({
        ...mockUserEntity,
        email: 'cypresstestemail+1@chayn.co',
      } as any);

      expect(mockFrontChatService.contactExists).not.toHaveBeenCalled();
    });

    it('does not throw when contactExists check fails', async () => {
      jest.mocked(mockFrontChatService.contactExists).mockRejectedValue(new Error('API down'));

      await expect(service.getOrCreateFrontContact(mockUserEntity)).resolves.not.toThrow();
    });

    it('does not throw when createContact fails', async () => {
      jest.mocked(mockFrontChatService.contactExists).mockResolvedValue(false);
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: [],
        courseUser: [],
      } as any);
      jest.mocked(mockFrontChatService.createContact).mockRejectedValue(new Error('API error'));

      await expect(service.getOrCreateFrontContact(mockUserEntity)).resolves.not.toThrow();
    });

    it('returns early when user not found in DB', async () => {
      jest.mocked(mockFrontChatService.contactExists).mockResolvedValue(false);
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue(null);

      await service.getOrCreateFrontContact(mockUserEntity);

      expect(mockFrontChatService.createContact).not.toHaveBeenCalled();
      expect(mockFrontChatService.updateContactCustomFields).not.toHaveBeenCalled();
    });
  });

  describe('updateServiceUserProfilesUser', () => {
    const baseHydratedUser = { ...mockUserEntity, partnerAccess: [], courseUser: [] };

    beforeEach(() => {
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue(baseHydratedUser as any);
    });

    it('should update Front Chat and mailchimp profile user data', async () => {
      await service.updateServiceUserProfilesUser(
        mockUserEntity,
        false,
        false,
        mockUserEntity.email,
      );

      const lastActiveAt = mockUserEntity.lastActiveAt.toISOString();

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledTimes(1);
      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
          email_reminders_frequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
          last_active_at: lastActiveAt,
        }),
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalledTimes(1);
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

    it('should update Front Chat and mailchimp profiles contact permissions', async () => {
      const mockUser: UserEntity = {
        ...mockUserEntity,
        contactPermission: false,
        serviceEmailsPermission: false,
      };
      // Override findOne to return the modified user so Front sync reflects the new permissions.
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUser,
        partnerAccess: [],
        courseUser: [],
      } as any);
      const lastActiveAt = mockUserEntity.lastActiveAt.toISOString();

      await service.updateServiceUserProfilesUser(mockUser, false, false, mockUser.email);

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          marketing_permission: false,
          service_emails_permission: false,
        }),
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

    it('should additionally call Front Chat contact profile update if required', async () => {
      await service.updateServiceUserProfilesUser(
        mockUserEntity,
        true,
        false,
        mockUserEntity.email,
      );

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledTimes(1);
      expect(updateMailchimpProfile).toHaveBeenCalled();

      expect(mockFrontChatService.updateContactProfile).toHaveBeenCalledWith(
        {
          name: mockUserEntity.name,
        },
        mockUserEntity.email,
      );
    });

    it("should update the user's email in Front Chat and mailchimp", async () => {
      const oldEmail = mockUserEntity.email;
      const newEmail = 'newemail@test.com';
      await service.updateServiceUserProfilesUser(
        { ...mockUserEntity, email: newEmail },
        true,
        true,
        oldEmail,
      );
      const serialisedMockUserData = service.serializeUserData(mockUserEntity);
      expect(mockFrontChatService.updateContactProfile).toHaveBeenCalledWith(
        { email: newEmail, name: 'name' },
        oldEmail,
      );
      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledTimes(1);
      expect(updateMailchimpProfile).toHaveBeenCalledWith(
        { ...serialisedMockUserData.mailchimpSchema, email_address: newEmail },
        oldEmail,
      );
    });

    it('should not propagate external api call errors', async () => {
      const mocked = jest.mocked(updateMailchimpProfile);
      mocked.mockRejectedValue(new Error('Mailchimp API call failed'));
      await expect(
        service.updateServiceUserProfilesUser(mockUserEntity, false, false, mockUserEntity.email),
      ).resolves.not.toThrow();
      mocked.mockReset();
    });

    it('should still update mailchimp when Front Chat fails', async () => {
      jest
        .mocked(mockFrontChatService.updateContactCustomFields)
        .mockRejectedValue(new Error('Front Chat API call failed'));

      await service.updateServiceUserProfilesUser(
        mockUserEntity,
        false,
        false,
        mockUserEntity.email,
      );

      expect(updateMailchimpProfile).toHaveBeenCalled();
    });
  });

  describe('updateServiceUserProfilesPartnerAccess', () => {
    beforeEach(() => {
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: [mockPartnerAccessEntity],
        courseUser: [],
      } as any);
    });

    it('should update Front Chat and mailchimp profile partner access data', async () => {
      await service.updateServiceUserProfilesPartnerAccess(
        [mockPartnerAccessEntity],
        mockUserEntity.email,
      );

      const partnerString = mockPartnerAccessEntity.partner.name.toLowerCase();

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          partners: partnerString,
          feature_live_chat: mockPartnerAccessEntity.featureLiveChat,
          feature_therapy: mockPartnerAccessEntity.featureTherapy,
          therapy_sessions_remaining: mockPartnerAccessEntity.therapySessionsRemaining,
          therapy_sessions_redeemed: mockPartnerAccessEntity.therapySessionsRedeemed,
        }),
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

    it('should update Front Chat and mailchimp profile multiple partner accesses data', async () => {
      const partnerAccesses = [mockPartnerAccessEntity, mockAltPartnerAccessEntity];
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: partnerAccesses,
        courseUser: [],
      } as any);
      await service.updateServiceUserProfilesPartnerAccess(partnerAccesses, mockUserEntity.email);

      const partnerString = service.serializePartnersString(partnerAccesses);

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          partners: partnerString,
          feature_live_chat: true,
          feature_therapy: true,
          therapy_sessions_remaining: 9,
          therapy_sessions_redeemed: 3,
        }),
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
      jest
        .mocked(mockFrontChatService.updateContactCustomFields)
        .mockRejectedValue(new Error('Front Chat API call failed'));
      await expect(
        service.updateServiceUserProfilesPartnerAccess(
          [mockPartnerAccessEntity],
          mockUserEntity.email,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('updateServiceUserProfilesTherapy', () => {
    it('should update Front Chat and mailchimp profile for first therapy booking', async () => {
      const therapySession = mockAltPartnerAccessEntity.therapySession[1];
      const partnerAccesses = [
        {
          ...mockAltPartnerAccessEntity,
          therapySessionsRemaining: 5,
          therapySessionsRedeemed: 1,
          therapySession: [therapySession],
        },
      ];
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: partnerAccesses,
        courseUser: [],
      } as any);

      await service.updateServiceUserProfilesTherapy(partnerAccesses, mockUserEntity.email);

      const firstTherapySessionAt = therapySession.startDateTime.toISOString();
      const nextTherapySessionAt = therapySession.startDateTime.toISOString();
      const lastTherapySessionAt = '';

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          therapy_sessions_remaining: 5,
          therapy_sessions_redeemed: 1,
          therapy_session_first_at: firstTherapySessionAt,
          therapy_session_next_at: nextTherapySessionAt,
          therapy_session_last_at: lastTherapySessionAt,
        }),
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

    it('should update Front Chat and mailchimp profile combined therapy data for new booking', async () => {
      const partnerAccesses = [mockPartnerAccessEntity, mockAltPartnerAccessEntity];
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: partnerAccesses,
        courseUser: [],
      } as any);

      await service.updateServiceUserProfilesTherapy(partnerAccesses, mockUserEntity.email);

      const firstTherapySessionAt =
        mockPartnerAccessEntity.therapySession[0].startDateTime.toISOString();
      const nextTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[1].startDateTime.toISOString();
      const lastTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[0].startDateTime.toISOString();

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          therapy_sessions_remaining: 9,
          therapy_sessions_redeemed: 3,
          therapy_session_first_at: firstTherapySessionAt,
          therapy_session_next_at: nextTherapySessionAt,
          therapy_session_last_at: lastTherapySessionAt,
        }),
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

    it('should update Front Chat and mailchimp profile combined therapy data for updated booking', async () => {
      const partnerAccesses = [mockPartnerAccessEntity, mockAltPartnerAccessEntity];
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: partnerAccesses,
        courseUser: [],
      } as any);

      await service.updateServiceUserProfilesTherapy(partnerAccesses, mockUserEntity.email);

      const firstTherapySessionAt =
        mockPartnerAccessEntity.therapySession[0].startDateTime.toISOString();
      const nextTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[1].startDateTime.toISOString();
      const lastTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[0].startDateTime.toISOString();

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          therapy_sessions_remaining: 9,
          therapy_sessions_redeemed: 3,
          therapy_session_first_at: firstTherapySessionAt,
          therapy_session_next_at: nextTherapySessionAt,
          therapy_session_last_at: lastTherapySessionAt,
        }),
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

    it('should update Front Chat and mailchimp profile combined therapy data for cancelled booking', async () => {
      mockAltPartnerAccessEntity.therapySession[1].action =
        SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING;
      const partnerAccesses = [mockPartnerAccessEntity, mockAltPartnerAccessEntity];
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: partnerAccesses,
        courseUser: [],
      } as any);

      await service.updateServiceUserProfilesTherapy(partnerAccesses, mockUserEntity.email);

      const firstTherapySessionAt =
        mockPartnerAccessEntity.therapySession[0].startDateTime.toISOString();
      const lastTherapySessionAt =
        mockAltPartnerAccessEntity.therapySession[0].startDateTime.toISOString();

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          therapy_sessions_remaining: 9,
          therapy_sessions_redeemed: 3,
          therapy_session_first_at: firstTherapySessionAt,
          therapy_session_next_at: '',
          therapy_session_last_at: lastTherapySessionAt,
        }),
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
    beforeEach(() => {
      jest.spyOn(mockedUserRepository, 'findOne').mockResolvedValue({
        ...mockUserEntity,
        partnerAccess: [],
        courseUser: [mockCourseUserEntity],
      } as any);
    });

    it('should update Front Chat and mailchimp profile course data', async () => {
      await service.updateServiceUserProfilesCourse(mockCourseUserEntity, mockUserEntity.email);

      expect(mockFrontChatService.updateContactCustomFields).toHaveBeenCalledWith(
        expect.objectContaining({
          course_cn: 'Started',
          course_cn_sessions: 'WAB:C',
        }),
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
      jest
        .mocked(mockFrontChatService.updateContactCustomFields)
        .mockRejectedValue(new Error('Front Chat API call failed'));
      await expect(
        service.updateServiceUserProfilesCourse(mockCourseUserEntity, mockUserEntity.email),
      ).resolves.not.toThrow();
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
});
