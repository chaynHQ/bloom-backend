import { ICoursesWithSessions } from 'src/course/course.interface';
import { IPartnerAccessWithPartner } from 'src/partner-access/partner-access.interface';
import { IUser } from 'src/user/user.interface';
import { PROGRESS_STATUS } from 'src/utils/constants';

export const getAcronym = (text: string) => {
  return `${text
    .split(/\s/)
    .reduce((response, word) => (response += word.slice(0, 1)), '')
    .toLowerCase()}`;
};

export const formatCourseKey = (courseName: string) => {
  return `course_${getAcronym(courseName)}_status`;
};

export const formatSessionKey = (courseName: string, status: PROGRESS_STATUS) => {
  return `course_${getAcronym(courseName)}_sessions_${status.toLowerCase()}`;
};

// https://docs.crisp.chat/references/rest-api/v1/#add-new-people-profile
// Full details needed to add a new person
export const createCrispProfileData = (
  user: IUser,
  partnerAccesses: IPartnerAccessWithPartner[],
  courses?: ICoursesWithSessions[],
) => {
  let profileData = {
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

  if (!!courses && courses.length > 0) {
    const courseData = {};

    courses.forEach((course) => {
      const courseKey = formatCourseKey(course.name);
      courseData[`${courseKey}`] = course.status;

      const sessionsStartedKey = formatSessionKey(course.name, PROGRESS_STATUS.STARTED);
      const sessionsStarted = course.sessions.filter((session) => !session.completed).join('; ');
      courseData[`${sessionsStartedKey}`] = sessionsStarted;
      const sessionsCompletedKey = formatSessionKey(course.name, PROGRESS_STATUS.COMPLETED);
      const sessionsCompleted = course.sessions.filter((session) => !!session.completed).join('; ');
      courseData[`${sessionsCompletedKey}`] = sessionsCompleted;
    });
    profileData = Object.assign({}, profileData, courseData);
  }

  return profileData;
};
