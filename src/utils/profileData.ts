import { addCrispProfile, updateCrispProfileData } from 'src/api/crisp/crisp-api';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { UserEntity } from 'src/entities/user.entity';

export const getAcronym = (text: string) => {
  return `${text
    .split(/\s/)
    .reduce((response, word) => (response += word.slice(0, 1)), '')
    .toLowerCase()}`;
};

export const formatCourseUserValue = (courseUser: CourseUserEntity) => {
  return `${getAcronym(courseUser.course.name)}:${courseUser.completed ? 'C' : 'S'}`;
};

export const formatSessionUserValue = (sessionUser: SessionUserEntity) => {
  return `${getAcronym(sessionUser.session.name)}:${sessionUser.completed ? 'C' : 'S'}`;
};

export const createServicesProfiles = async (
  user: UserEntity,
  partner: PartnerEntity,
  partnerAccess: PartnerAccessEntity,
  courses?: CourseUserEntity[],
) => {
  if (partnerAccess) partnerAccess.partner = partner;

  await addCrispProfile({
    email: user.email,
    person: { nickname: user.name },
    segments: [partner?.name.toLowerCase() || 'public'],
  });

  await updateCrispProfileData(
    {
      ...serializeUserData(user),
      ...serializePartnerAccessData([partnerAccess]),
      ...(courses?.length && { ...serializeCourseData(courses) }),
    },
    user.email,
  );
};

export const serializeUserData = (user: UserEntity) => {
  const userData = {
    language: user.signUpLanguage,
    marketing_permission: user.contactPermission,
    service_emails_permission: user.serviceEmailsPermission,
  };
  return userData;
};

export const serializePartnerAccessData = (partnerAccesses: PartnerAccessEntity[]) => {
  const partnerAccessData = {
    partners: partnerAccesses.map((pa) => pa.partner.name).join('; ') || '',
    feature_live_chat: !!partnerAccesses.find((pa) => !!pa.featureLiveChat),
    feature_therapy: !!partnerAccesses.find((pa) => !!pa.featureTherapy),
    therapy_sessions_remaining: partnerAccesses
      .map((pa) => pa.therapySessionsRemaining)
      .reduce((a, b) => a + b, 0),
    therapy_sessions_redeemed: partnerAccesses
      .map((pa) => pa.therapySessionsRedeemed)
      .reduce((a, b) => a + b, 0),
  };
  return partnerAccessData;
};

export const serializeCourseData = (courseUsers?: CourseUserEntity[]) => {
  const sessionKeyValues = {};

  courseUsers.forEach((courseUser) => {
    sessionKeyValues[`course_${getAcronym(courseUser.course.name)}_sessions`] =
      courseUser.sessionUser.map((sessionUser) => formatSessionUserValue(sessionUser)).join('; ');
  });

  const courseData = {
    courses: courseUsers.map((courseUser) => formatCourseUserValue(courseUser)).join(';'),
    ...sessionKeyValues,
  };

  return courseData;
};
