import { createCrispProfile, updateCrispProfileData } from 'src/api/crisp/crisp-api';
import { createMailchimpProfile, updateMailchimpProfile } from 'src/api/mailchimp/mailchimp-api';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { COMMUNICATION_SERVICE, PROGRESS_STATUS } from './constants';

export const getAcronym = (text: string) => {
  const exclude = ['in', 'and', 'the', 'from', 'as', 'or', 'to'];
  const string = text.split(' ').filter((word) => !exclude.includes(word));
  const abbreviatedString = string
    .reduce((response, word) => (response += word.slice(0, 1)), '')
    .toLowerCase();

  return abbreviatedString;
};

export const createServicesProfiles = async (
  user: UserEntity,
  partner: PartnerEntity,
  partnerAccess: PartnerAccessEntity,
) => {
  await createCrispProfile({
    email: user.email,
    person: { nickname: user.name },
    segments: [partner?.name.toLowerCase() || 'public'],
  });

  await updateCrispProfileData(
    {
      ...serializeUserData(user, COMMUNICATION_SERVICE.CRISP),
      ...(partnerAccess &&
        serializePartnerAccessData([{ ...partnerAccess, partner }], COMMUNICATION_SERVICE.CRISP)),
    },
    user.email,
  );

  await createMailchimpProfile({
    email_address: user.email,
    status: 'subscribed',
    merge_fields: {
      ...serializeUserData(user, COMMUNICATION_SERVICE.MAILCHIMP),
      ...(partnerAccess &&
        serializePartnerAccessData(
          [{ ...partnerAccess, partner }],
          COMMUNICATION_SERVICE.MAILCHIMP,
        )),
    },
  });
};

export const updateServicesProfilesTherapy = async (
  partnerAccesses: PartnerAccessEntity[],
  email,
) => {
  updateCrispProfileData(serializeTherapyData(partnerAccesses, COMMUNICATION_SERVICE.CRISP), email);
  updateMailchimpProfile(
    { merge_fields: serializeTherapyData(partnerAccesses, COMMUNICATION_SERVICE.MAILCHIMP) },
    email,
  );
};

export const updateServicesProfilesPartnerAccess = async (
  email: string,
  partnerAccesses: PartnerAccessEntity[],
) => {
  updateCrispProfileData(
    serializePartnerAccessData(partnerAccesses, COMMUNICATION_SERVICE.CRISP),
    email,
  );
  updateMailchimpProfile(
    { merge_fields: serializePartnerAccessData(partnerAccesses, COMMUNICATION_SERVICE.MAILCHIMP) },
    email,
  );
};

export const updateServicesProfilesCourse = async (email: string, courseUser: CourseUserEntity) => {
  updateCrispProfileData(serializeCourseData(courseUser, COMMUNICATION_SERVICE.CRISP), email);
  updateMailchimpProfile(
    { merge_fields: serializeCourseData(courseUser, COMMUNICATION_SERVICE.MAILCHIMP) },
    email,
  );
};

export const serializeUserData = (user: UserEntity, service: COMMUNICATION_SERVICE) => {
  const isCrisp = service === COMMUNICATION_SERVICE.CRISP;

  const keys = {
    name: isCrisp ? 'nickname' : 'NAME',
    signUpLanguage: isCrisp ? 'language' : 'LANGUAGE',
    contactPermission: 'marketing_permission', // Handled separately in mailchimp
    serviceEmailsPermission: 'service_emails_permission', // Handled separately in mailchimp
  };

  const userData = {
    [keys.name]: user.name,
    [keys.signUpLanguage]: user.signUpLanguage,
    ...(isCrisp && { [keys.contactPermission]: user.contactPermission }),
    ...(isCrisp && { [keys.serviceEmailsPermission]: user.serviceEmailsPermission }),
  };
  return userData;
};

export const serializePartnerAccessData = (
  partnerAccesses: PartnerAccessEntity[],
  service: COMMUNICATION_SERVICE,
) => {
  const isCrisp = service === COMMUNICATION_SERVICE.CRISP;

  const keys = {
    partners: isCrisp ? 'partners' : 'PARTNERS',
    featureLiveChat: isCrisp ? 'feature_live_chat' : 'FEATCHAT',
    featureTherapy: isCrisp ? 'feature_therapy' : 'FEATTHER',
    therapySessionsRemaining: isCrisp ? 'therapy_sessions_remaining' : 'THERREMAIN',
    therapySessionsRedeemed: isCrisp ? 'therapy_sessions_redeemed' : 'THERREDEEM',
  };

  const partnerAccessData = {
    [keys.partners]: partnerAccesses.map((pa) => pa.partner?.name || '').join('; ') || '',
    [keys.featureLiveChat]: !!partnerAccesses.find((pa) => !!pa.featureLiveChat),
    [keys.featureTherapy]: !!partnerAccesses.find((pa) => !!pa.featureTherapy),
    [keys.therapySessionsRemaining]: partnerAccesses
      .map((pa) => pa.therapySessionsRemaining)
      .reduce((a, b) => a + b, 0),
    [keys.therapySessionsRedeemed]: partnerAccesses
      .map((pa) => pa.therapySessionsRedeemed)
      .reduce((a, b) => a + b, 0),
  };

  return partnerAccessData;
};

export const serializeCourseData = (
  courseUser: CourseUserEntity,
  service: COMMUNICATION_SERVICE,
) => {
  const isCrisp = service === COMMUNICATION_SERVICE.CRISP;
  const courseAcronymLowercase = getAcronym(courseUser.course.name);
  const courseAcronymUppercase = getAcronym(courseUser.course.name).toUpperCase();

  const keys = {
    course: isCrisp ? `course_${courseAcronymLowercase}` : `C_${courseAcronymUppercase}`,
    sessions: isCrisp
      ? `course_${courseAcronymLowercase}_sessions`
      : `C_${courseAcronymUppercase}_S`,
  };

  // Returns e.g. { course_IBA: "Started", course_IBA_sessions: "IBDP:Started; DOC:Completed"}
  const courseData = {
    [keys.course]: courseUser.completed ? PROGRESS_STATUS.COMPLETED : PROGRESS_STATUS.STARTED,

    [keys.sessions]: courseUser.sessionUser
      .map(
        (sessionUser) =>
          `${getAcronym(sessionUser.session.name)}:${sessionUser.completed ? 'C' : 'S'}`,
      )
      .join('; '),
  };

  return courseData;
};

export const serializeTherapyData = (
  partnerAccesses: PartnerAccessEntity[],
  service: COMMUNICATION_SERVICE,
) => {
  const isCrisp = service === COMMUNICATION_SERVICE.CRISP;

  const keys = {
    therapySessionsRemaining: isCrisp ? 'therapy_sessions_remaining' : 'THERREMAIN',
    therapySessionsRedeemed: isCrisp ? 'therapy_sessions_redeemed' : 'THERREDEEM',
  };

  const therapySessionsRemaining = partnerAccesses.reduce(
    (sum, partnerAccess) => sum + partnerAccess.therapySessionsRemaining,
    0,
  );
  const therapySessionsRedeemed = partnerAccesses.reduce(
    (sum, partnerAccess) => sum + partnerAccess.therapySessionsRedeemed,
    0,
  );

  const therapyData = {
    [keys.therapySessionsRemaining]: therapySessionsRemaining,
    [keys.therapySessionsRedeemed]: therapySessionsRedeemed,
  };
  return therapyData;
};
