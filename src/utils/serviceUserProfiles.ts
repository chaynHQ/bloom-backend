import { Logger } from '@nestjs/common';
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
import {
  ListMemberPartial,
  MAILCHIMP_MERGE_FIELD_TYPES,
} from 'src/api/mailchimp/mailchimp-api.interfaces';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PROGRESS_STATUS, SIMPLYBOOK_ACTION_ENUM } from './constants';
import { getAcronym } from './utils';

// Functionality for syncing user profiles for Crisp and Mailchimp communications services.
// User data must be serialized to handle service-specific data structure and different key names
// due to mailchimp field name restrictions allowing only max 10 uppercase characters

// Note errors are not thrown to prevent the more important calling functions from failing
// Instead log errors which are also captured by rollbar error reporting
const logger = new Logger('UserService');

export const createServiceUserProfiles = async (
  user: UserEntity,
  partner?: PartnerEntity | null,
  partnerAccess?: PartnerAccessEntity | null,
) => {
  try {
    const userData = serializeUserData(user);
    const partnerData = partnerAccess
      ? serializePartnerAccessData([{ ...partnerAccess, partner }])
      : null;

    await createCrispProfile({
      email: user.email,
      person: { nickname: user.name, locales: [user.signUpLanguage || 'en'] },
      segments: serializeCrispPartnerSegments(partner ? [partner] : []),
    });

    const userSignedUpAt = user.createdAt?.toISOString();

    updateCrispProfile(
      {
        signed_up_at: userSignedUpAt,
        ...userData.crispSchema,
        ...(partnerData && partnerData.crispSchema),
      },
      user.email,
    );

    const mailchimpMergeFields = {
      SIGNUPD: userSignedUpAt,
      ...userData.mailchimpSchema.merge_fields,
      ...(partnerData && partnerData.mailchimpSchema.merge_fields),
    };

    createMailchimpProfile({
      email_address: user.email,
      ...userData.mailchimpSchema,
      ...(partnerData && partnerData.mailchimpSchema),
      merge_fields: mailchimpMergeFields,
    });
  } catch (error) {
    logger.error(`Create service user profiles error - ${error}`);
    throw error;
  }
};

export const updateServiceUserProfilesUser = async (
  user: UserEntity,
  isCrispBaseUpdateRequired: boolean,
  email: string,
) => {
  try {
    if (isCrispBaseUpdateRequired) {
      // Extra call required to update crisp "base" profile when name or sign up language is changed
      updateCrispProfileBase(
        { person: { nickname: user.name, locales: [user.signUpLanguage || 'en'] } },
        email,
      );
    }
    const userData = serializeUserData(user);
    updateCrispProfile(userData.crispSchema, email);
    updateMailchimpProfile(userData.mailchimpSchema, email);
  } catch (error) {
    logger.error(`Update service user profiles user error - ${error}`);
  }
};

export const updateServiceUserProfilesPartnerAccess = async (
  partnerAccesses: PartnerAccessEntity[],
  email: string,
) => {
  try {
    const partners = partnerAccesses.map((pa) => pa.partner);
    updateCrispProfileBase(
      {
        segments: serializeCrispPartnerSegments(partners),
      },
      email,
    );

    const partnerAccessData = serializePartnerAccessData(partnerAccesses);
    updateCrispProfile(partnerAccessData.crispSchema, email);
    updateMailchimpProfile(partnerAccessData.mailchimpSchema, email);
  } catch (error) {
    logger.error(`Update service user profiles partner access error - ${error}`);
  }
};

export const updateServiceUserProfilesTherapy = async (
  partnerAccesses: PartnerAccessEntity[],
  therapySessionAction: SIMPLYBOOK_ACTION_ENUM,
  therapySessionDate: Date,
  email,
) => {
  try {
    const therapyData = serializeTherapyData(
      partnerAccesses,
      therapySessionAction,
      therapySessionDate,
    );
    updateCrispProfile(therapyData.crispSchema, email);
    updateMailchimpProfile(therapyData.mailchimpSchema, email);
  } catch (error) {
    logger.error(`Update service user profiles therapy error - ${error}`);
  }
};

export const updateServiceUserProfilesCourse = async (
  courseUser: CourseUserEntity,
  email: string,
) => {
  try {
    const courseData = serializeCourseData(courseUser);
    updateCrispProfile(courseData.crispSchema, email);
    updateMailchimpProfile(courseData.mailchimpSchema, email);
  } catch (error) {
    logger.error(`Update service user profiles course error - ${error}`);
  }
};

// Merge fields (custom fields) in mailchimp must be created before they are used
// This function creates 2 new mailchimp merge fields for a new course
export const createMailchimpCourseMergeField = async (courseName: string) => {
  try {
    const courseAcronym = getAcronym(courseName);
    const courseMergeFieldKey = `C_${courseAcronym}`;
    const courseSessionsMergeFieldKey = `C_${courseAcronym}_S`;

    createMailchimpMergeField(courseMergeFieldKey, MAILCHIMP_MERGE_FIELD_TYPES.TEXT);
    createMailchimpMergeField(courseSessionsMergeFieldKey, MAILCHIMP_MERGE_FIELD_TYPES.TEXT);
  } catch (error) {
    logger.error(`Create mailchimp course merge fields error - ${error}`);
  }
};

export const serializePartnersString = (partnerAccesses: PartnerAccessEntity[]) => {
  return partnerAccesses.map((pa) => pa.partner.name.toLowerCase()).join('; ') || '';
};

const serializeUserData = (user: UserEntity) => {
  const { name, signUpLanguage, contactPermission, serviceEmailsPermission } = user;

  const crispSchema = {
    marketing_permission: contactPermission,
    service_emails_permission: serviceEmailsPermission,
    // Name and language handled on base level profile for crisp
  };

  const mailchimpSchema = {
    status: serviceEmailsPermission ? 'subscribed' : 'unsubscribed',
    marketing_permissions: [
      {
        marketing_permission_id: '874073',
        text: 'Marketing Permissions',
        enabled: contactPermission,
      },
    ],
    language: signUpLanguage,
    merge_fields: { NAME: name },
  } as ListMemberPartial;

  return { crispSchema, mailchimpSchema };
};

const serializePartnerAccessData = (partnerAccesses: PartnerAccessEntity[]) => {
  const data = {
    partners: serializePartnersString(partnerAccesses),
    featureLiveChat: !!partnerAccesses.find((pa) => pa.featureLiveChat),
    featureTherapy: !!partnerAccesses.find((pa) => pa.featureTherapy),
    therapySessionsRemaining: partnerAccesses
      .map((pa) => pa.therapySessionsRemaining)
      .reduce((a, b) => a + b, 0),
    therapySessionsRedeemed: partnerAccesses
      .map((pa) => pa.therapySessionsRedeemed)
      .reduce((a, b) => a + b, 0),
  };

  const crispSchema = {
    partners: data.partners,
    feature_live_chat: data.featureLiveChat,
    feature_therapy: data.featureTherapy,
    therapy_sessions_remaining: data.therapySessionsRemaining,
    therapy_sessions_redeemed: data.therapySessionsRedeemed,
  };

  const mailchimpSchema = {
    merge_fields: {
      PARTNERS: data.partners,
      FEATCHAT: String(data.featureLiveChat),
      FEATTHER: String(data.featureTherapy),
      THERREMAIN: data.therapySessionsRemaining,
      THERREDEEM: data.therapySessionsRedeemed,
    },
  } as ListMemberPartial;

  return { crispSchema, mailchimpSchema };
};

const serializeTherapyData = (
  partnerAccesses: PartnerAccessEntity[],
  therapySessionAction: SIMPLYBOOK_ACTION_ENUM,
  therapySessionDate: Date,
) => {
  const therapySessions = partnerAccesses
    .flatMap((partnerAccess) => partnerAccess.therapySession)
    .filter((therapySession) => therapySession.action !== SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING)
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  const pastTherapySessions = therapySessions.filter(
    (therapySession) =>
      therapySession.startDateTime !== therapySessionDate &&
      therapySession.startDateTime.getTime() < new Date().getTime(),
  );
  const futureTherapySessions = therapySessions.filter(
    (therapySession) => therapySession.startDateTime.getTime() > new Date().getTime(),
  );

  const firstTherapySessionAt = therapySessions?.at(0)?.startDateTime.toISOString() || '';

  const lastTherapySessionAt = pastTherapySessions?.at(-1)?.startDateTime.toISOString() || '';

  const nextTherapySessionAt =
    therapySessionAction === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING
      ? futureTherapySessions?.at(-1)?.startDateTime.toISOString() || ''
      : therapySessionDate.toISOString();

  const data = {
    therapySessionsRemaining: partnerAccesses.reduce(
      (sum, partnerAccess) => sum + partnerAccess.therapySessionsRemaining,
      0,
    ),
    therapySessionsRedeemed: partnerAccesses.reduce(
      (sum, partnerAccess) => sum + partnerAccess.therapySessionsRedeemed,
      0,
    ),
  };

  const crispSchema = {
    therapy_sessions_remaining: data.therapySessionsRemaining,
    therapy_sessions_redeemed: data.therapySessionsRedeemed,
    therapy_session_first_at: firstTherapySessionAt,
    therapy_session_next_at: nextTherapySessionAt,
    therapy_session_last_at: lastTherapySessionAt,
  };

  const mailchimpSchema = {
    merge_fields: {
      THERREMAIN: data.therapySessionsRemaining,
      THERREDEEM: data.therapySessionsRedeemed,
      THERFIRSAT: firstTherapySessionAt,
      THERNEXTAT: nextTherapySessionAt,
      THERLASTAT: lastTherapySessionAt,
    },
  };

  return { crispSchema, mailchimpSchema };
};

const serializeCourseData = (courseUser: CourseUserEntity) => {
  const courseAcronymLowercase = getAcronym(courseUser.course.name).toLowerCase();
  const courseAcronymUppercase = getAcronym(courseUser.course.name);

  const data = {
    course: courseUser.completed ? PROGRESS_STATUS.COMPLETED : PROGRESS_STATUS.STARTED,
    sessions: courseUser.sessionUser
      .map(
        (sessionUser) =>
          `${getAcronym(sessionUser.session.name)}:${sessionUser.completed ? 'C' : 'S'}`,
      )
      .join('; '),
  };

  const crispSchema = {
    [`course_${courseAcronymLowercase}`]: data.course,
    [`course_${courseAcronymLowercase}_sessions`]: data.sessions,
  };

  const mailchimpSchema = {
    merge_fields: {
      [`C_${courseAcronymUppercase}`]: data.course,
      [`C_${courseAcronymUppercase}_S`]: data.sessions,
    },
  } as ListMemberPartial;

  return { crispSchema, mailchimpSchema };
};

const serializeCrispPartnerSegments = (partners: PartnerEntity[]) => {
  if (!partners.length) return ['public'];
  return partners.map((p) => p.name.toLowerCase());
};
