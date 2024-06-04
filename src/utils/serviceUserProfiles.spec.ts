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
import {
  mockAltPartnerAccessEntity,
  mockCourseUserEntity,
  mockPartnerAccessEntity,
  mockPartnerEntity,
  mockUserEntity,
} from 'test/utils/mockData';
import { SIMPLYBOOK_ACTION_ENUM, mailchimpMarketingPermissionId } from './constants';
import {
  createMailchimpCourseMergeField,
  createServiceUserProfiles,
  serializePartnersString,
  updateServiceUserProfilesCourse,
  updateServiceUserProfilesPartnerAccess,
  updateServiceUserProfilesTherapy,
  updateServiceUserProfilesUser,
} from './serviceUserProfiles';

jest.mock('src/api/crisp/crisp-api');
jest.mock('src/api/mailchimp/mailchimp-api');

describe('Service user profiles', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('createServiceUserProfiles', () => {
    it('should create crisp and mailchimp profiles for a public user', async () => {
      await createServiceUserProfiles(mockUserEntity);

      expect(createCrispProfile).toHaveBeenCalledWith({
        email: mockUserEntity.email,
        person: { nickname: mockUserEntity.name, locales: [mockUserEntity.signUpLanguage] },
        segments: ['public'],
      });

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
          signed_up_at: mockUserEntity.createdAt.toISOString(),
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
          SIGNUPD: mockUserEntity.createdAt.toISOString(),
          NAME: mockUserEntity.name,
          FEATCHAT: 'true',
          FEATTHER: 'false',
          PARTNERS: '',
          THERREMAIN: 0,
          THERREDEEM: 0,
        },
      });
    });

    it('should create crisp and mailchimp profiles for a partner user', async () => {
      await createServiceUserProfiles(mockUserEntity, mockPartnerEntity, mockPartnerAccessEntity);

      const partnerName = mockPartnerEntity.name.toLowerCase();

      expect(createCrispProfile).toHaveBeenCalledWith({
        email: mockUserEntity.email,
        person: { nickname: mockUserEntity.name, locales: [mockUserEntity.signUpLanguage] },
        segments: [partnerName],
      });

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          signed_up_at: mockUserEntity.createdAt.toISOString(),
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
          partners: partnerName,
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
          NAME: mockUserEntity.name,
          PARTNERS: partnerName,
          FEATCHAT: String(mockPartnerAccessEntity.featureLiveChat),
          FEATTHER: String(mockPartnerAccessEntity.featureTherapy),
          THERREMAIN: mockPartnerAccessEntity.therapySessionsRemaining,
          THERREDEEM: mockPartnerAccessEntity.therapySessionsRedeemed,
        },
      });
    });
  });
  describe('updateServiceUserProfilesUser', () => {
    it('should update crisp and mailchimp profile user data', async () => {
      await updateServiceUserProfilesUser(mockUserEntity, false, mockUserEntity.email);

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          marketing_permission: mockUserEntity.contactPermission,
          service_emails_permission: mockUserEntity.serviceEmailsPermission,
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
          merge_fields: { NAME: mockUserEntity.name },
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

      await updateServiceUserProfilesUser(mockUser, false, mockUser.email);

      expect(updateCrispProfile).toHaveBeenCalledWith(
        {
          marketing_permission: false,
          service_emails_permission: false,
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
          merge_fields: { NAME: mockUser.name },
        },
        mockUser.email,
      );
    });

    it('should additionally call crisp base profile update if required', async () => {
      await updateServiceUserProfilesUser(mockUserEntity, true, mockUserEntity.email);

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
  });

  describe('updateServiceUserProfilesPartnerAccess', () => {
    it('should update crisp and mailchimp profile partner access data', async () => {
      await updateServiceUserProfilesPartnerAccess([mockPartnerAccessEntity], mockUserEntity.email);

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
      await updateServiceUserProfilesPartnerAccess(partnerAccesses, mockUserEntity.email);

      const partnerString = serializePartnersString(partnerAccesses);

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

      await updateServiceUserProfilesTherapy(
        partnerAccesses,
        SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
        therapySession.startDateTime,
        mockUserEntity.email,
      );

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

      await updateServiceUserProfilesTherapy(
        partnerAccesses,
        SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
        mockAltPartnerAccessEntity.therapySession[1].startDateTime,
        mockUserEntity.email,
      );

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

      await updateServiceUserProfilesTherapy(
        partnerAccesses,
        SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
        mockAltPartnerAccessEntity.therapySession[1].startDateTime,
        mockUserEntity.email,
      );

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

      await updateServiceUserProfilesTherapy(
        partnerAccesses,
        SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
        mockAltPartnerAccessEntity.therapySession[1].startDateTime,
        mockUserEntity.email,
      );

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
  });

  describe('updateServiceUserProfilesCourse', () => {
    it('should update crisp and mailchimp profile course data', async () => {
      await updateServiceUserProfilesCourse(mockCourseUserEntity, mockUserEntity.email);

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
  });

  describe('createMailchimpCourseMergeField', () => {
    it('should create mailchimp course merge field', async () => {
      await createMailchimpCourseMergeField('Full course name');

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
