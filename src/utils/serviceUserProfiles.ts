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
import {
  PROGRESS_STATUS,
  SIMPLYBOOK_ACTION_ENUM,
  mailchimpMarketingPermissionId,
} from './constants';
import { getAcronym } from './utils';

// Functionality for syncing user profiles for Crisp and Mailchimp communications services.
// User data must be serialized to handle service-specific data structure and different key names
// due to mailchimp field name restrictions allowing only max 10 uppercase characters

// Note errors are not thrown to prevent the more important calling functions from failing
// Instead log errors which are also captured by rollbar error reporting
const logger = new Logger('ServiceUserProfiles');

export const createServiceUserProfiles = async (
  user: UserEntity,
  partner?: PartnerEntity | null,
  partnerAccess?: PartnerAccessEntity | null,
) => {
  const { email } = user;
  try {
    const userData = serializeUserData(user);

    const partnerData = serializePartnerAccessData(
      partnerAccess ? [{ ...partnerAccess, partner }] : [],
    );

    await createCrispProfile({
      email: email,
      person: { nickname: user.name, locales: [user.signUpLanguage || 'en'] },
      segments: serializeCrispPartnerSegments(partner ? [partner] : []),
    });

    const userSignedUpAt = user.createdAt?.toISOString();

    await updateCrispProfile(
      {
        signed_up_at: userSignedUpAt,
        ...userData.crispSchema,
        ...partnerData.crispSchema,
      },
      email,
    );

    const mailchimpMergeFields = {
      SIGNUPD: userSignedUpAt,
      ...userData.mailchimpSchema.merge_fields,
      ...partnerData.mailchimpSchema.merge_fields,
    };

    await createMailchimpProfile({
      email_address: email,
      ...userData.mailchimpSchema,
      ...partnerData.mailchimpSchema,
      merge_fields: mailchimpMergeFields,
    });

    logger.log(`Create user: updated service user profiles. User: ${email}`);
  } catch (error) {
    logger.error(`Create service user profiles error - ${error}. User: ${email}`);
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
      await updateCrispProfileBase(
        {
          person: {
            nickname: user.name,
            locales: [user.signUpLanguage || 'en'],
          },
        },
        email,
      );
    }
    const userData = serializeUserData(user);
    await updateCrispProfile(userData.crispSchema, email);
    await updateMailchimpProfile(userData.mailchimpSchema, email);
  } catch (error) {
    logger.error(`Update service user profiles user error - ${error}`);
  }
};

export const updateServiceUserEmailAndProfiles = async (user: UserEntity, email: string) => {
  try {
    await updateCrispProfileBase(
      {
        email: user.email,
        person: {
          nickname: user.name,
          locales: [user.signUpLanguage || 'en'],
        },
      },
      email,
    );
    logger.log({ event: 'UPDATE_CRISP_PROFILE_BASE', userId: user.id });
    const userData = serializeUserData(user);
    await updateCrispProfile(userData.crispSchema, user.email);
    logger.log({ event: 'UPDATE_CRISP_PROFILE', userId: user.id });
    await updateMailchimpProfile({ ...userData.mailchimpSchema, email_address: user.email }, email);
    logger.log({ event: 'UPDATE_MAILCHIMP_PROFILE', userId: user.id });
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
    await updateCrispProfileBase(
      {
        segments: serializeCrispPartnerSegments(partners),
      },
      email,
    );

    const partnerAccessData = serializePartnerAccessData(partnerAccesses);
    await updateCrispProfile(partnerAccessData.crispSchema, email);
    await updateMailchimpProfile(partnerAccessData.mailchimpSchema, email);
  } catch (error) {
    logger.error(`Update service user profiles partner access error - ${error}`);
  }
};

export const updateServiceUserProfilesTherapy = async (
  partnerAccesses: PartnerAccessEntity[],
  email,
) => {
  try {
    const therapyData = serializeTherapyData(partnerAccesses);
    await updateCrispProfile(therapyData.crispSchema, email);
    await updateMailchimpProfile(therapyData.mailchimpSchema, email);
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
    await updateCrispProfile(courseData.crispSchema, email);
    await updateMailchimpProfile(courseData.mailchimpSchema, email);
  } catch (error) {
    logger.error(`Update service user profiles course error - ${error}`);
  }
};

// Merge fields (custom fields) in mailchimp must be created before they are used
// This function creates 2 new mailchimp merge fields for a new course
export const createMailchimpCourseMergeField = async (courseName: string) => {
  try {
    const courseAcronym = getAcronym(courseName);
    const courseMergeFieldName = `Course ${courseAcronym} Status`;
    const courseMergeFieldTag = `C_${courseAcronym}`;
    const courseSessionsMergeFieldName = `Course ${courseAcronym} Sessions`;
    const courseSessionsMergeFieldTag = `C_${courseAcronym}_S`;

    await createMailchimpMergeField(
      courseMergeFieldName,
      courseMergeFieldTag,
      MAILCHIMP_MERGE_FIELD_TYPES.TEXT,
    );
    await createMailchimpMergeField(
      courseSessionsMergeFieldName,
      courseSessionsMergeFieldTag,
      MAILCHIMP_MERGE_FIELD_TYPES.TEXT,
    );
  } catch (error) {
    logger.error(`Create mailchimp course merge fields error - ${error}`);
  }
};

// Currently only used in bulk upload function, as mailchimp profiles are typically built
// incrementally on sign up and subsequent user actions
export const createCompleteMailchimpUserProfile = (user: UserEntity): ListMemberPartial => {
  const userData = serializeUserData(user);
  const partnerData = serializePartnerAccessData(user.partnerAccess);
  const therapyData = serializeTherapyData(user.partnerAccess);

  const courseData = {};
  user.courseUser.forEach((courseUser) => {
    const courseUserData = serializeCourseData(courseUser);
    Object.keys(courseUserData.mailchimpSchema.merge_fields).forEach((key) => {
      courseData[key] = courseUserData.mailchimpSchema.merge_fields[key];
    });
  });

  const profileData = {
    email_address: user.email,
    ...userData.mailchimpSchema,

    merge_fields: {
      SIGNUPD: user.createdAt?.toISOString(),
      ...userData.mailchimpSchema.merge_fields,
      ...partnerData.mailchimpSchema.merge_fields,
      ...therapyData.mailchimpSchema.merge_fields,
      ...courseData,
    },
  };
  return profileData;
};

export const serializePartnersString = (partnerAccesses: PartnerAccessEntity[]) => {
  const partnersNames = partnerAccesses?.map((pa) => pa.partner.name.toLowerCase());
  const partnersString = partnersNames ? [...new Set(partnersNames)].join('; ') : '';
  return partnersString;
};

const serializeCrispPartnerSegments = (partners: PartnerEntity[]) => {
  if (!partners.length) return ['public'];
  return partners.map((p) => p.name.toLowerCase());
};

export const serializeUserData = (user: UserEntity) => {
  const {
    name,
    signUpLanguage,
    contactPermission,
    serviceEmailsPermission,
    lastActiveAt,
    emailRemindersFrequency,
  } = user;
  const lastActiveAtString = lastActiveAt?.toISOString() || '';

  const crispSchema = {
    marketing_permission: contactPermission,
    service_emails_permission: serviceEmailsPermission,
    last_active_at: lastActiveAtString,
    email_reminders_frequency: emailRemindersFrequency,
    // Name and language handled on base level profile for crisp
  };

  const mailchimpSchema = {
    status: serviceEmailsPermission ? 'subscribed' : 'unsubscribed',
    marketing_permissions: [
      {
        marketing_permission_id: mailchimpMarketingPermissionId,
        text: 'Email',
        enabled: contactPermission,
      },
    ],
    language: signUpLanguage || 'en',
    merge_fields: {
      NAME: name,
      LACTIVED: lastActiveAtString,
      REMINDFREQ: emailRemindersFrequency,
    },
  } as ListMemberPartial;

  return { crispSchema, mailchimpSchema };
};

const serializePartnerAccessData = (partnerAccesses: PartnerAccessEntity[]) => {
  const publicUser = !partnerAccesses || !partnerAccesses[0]?.id;

  const data = publicUser
    ? {
        partners: '',
        featureLiveChat: true,
        featureTherapy: false,
        therapySessionsRemaining: 0,
        therapySessionsRedeemed: 0,
      }
    : {
        partners: serializePartnersString(partnerAccesses),
        featureLiveChat: !!partnerAccesses.find((pa) => pa.featureLiveChat) || true,
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

const serializeTherapyData = (partnerAccesses: PartnerAccessEntity[]) => {
  const therapySessions = partnerAccesses
    .flatMap((partnerAccess) => partnerAccess.therapySession)
    .filter((therapySession) => therapySession.action !== SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING)
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  const pastTherapySessions = therapySessions.filter(
    (therapySession) => therapySession.startDateTime.getTime() < new Date().getTime(),
  );
  const futureTherapySessions = therapySessions.filter(
    (therapySession) => therapySession.startDateTime.getTime() > new Date().getTime(),
  );

  const firstTherapySessionAt = therapySessions?.at(0)?.startDateTime.toISOString() || '';

  const lastTherapySessionAt = pastTherapySessions?.at(-1)?.startDateTime.toISOString() || '';

  const nextTherapySessionAt = futureTherapySessions?.at(0)?.startDateTime.toISOString() || '';

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
