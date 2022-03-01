import { AxiosResponse } from 'axios';
import { ICoursesWithSessions } from 'src/course/course.interface';
import { IPartnerAccessWithPartner } from 'src/partner-access/partner-access.interface';
import { IUser } from '../../user/user.interface';
import { crispToken, crispWebsiteId, PROGRESS_STATUS } from '../../utils/constants';
import apiCall from '../apiCalls';
import {
  CrispResponse,
  NewPeopleProfile,
  NewPeopleProfileResponse,
  PeopleData,
} from './crisp-api.interfaces';

// https://docs.crisp.chat/references/rest-api/v1/#add-new-people-profile
// Full details needed to add a new person

const baseUrl = `https://api.crisp.chat/v1/website/${crispWebsiteId}`;

const headers = {
  Authorization: `Basic ${crispToken}`,
  'X-Crisp-Tier': 'plugin',
  '-ContentType': 'application/json',
};

const getAcronym = (text: string) => {
  return `${text
    .split(/\s/)
    .reduce((response, word) => (response += word.slice(0, 1)), '')
    .toLowerCase()}`;
};

const formatCourseName = (courseName: string) => {
  return `course_${getAcronym(courseName)}_status`;
};

const formatSessionName = (courseName: string, status: PROGRESS_STATUS) => {
  return `course_${getAcronym(courseName)}_sessions_${status.toLowerCase()}`;
};

export const createCrispProfileData = (
  user: IUser,
  partnerAccesses: IPartnerAccessWithPartner[],
  courses?: ICoursesWithSessions[],
) => {
  let profileData = {
    language_default: user.languageDefault,
    partners: partnerAccesses.map((pa) => pa.partner.name).join('; '),
    feature_live_chat: !!partnerAccesses.find((pa) => !!pa.featureLiveChat),
    feature_therapy: !!partnerAccesses.find((pa) => !!pa.featureTherapy),
    therapy_sessions_remaining: partnerAccesses
      .map((pa) => pa.therapySessionsRemaining)
      .reduce((a, b) => a + b),
    therapy_sessions_redeemed: partnerAccesses
      .map((pa) => pa.therapySessionsRedeemed)
      .reduce((a, b) => a + b),
  };

  if (!!courses && courses.length > 0) {
    const courseData = courses.forEach((course) => {
      const courseFormattedName = formatCourseName(course.name);
      courseData[`${courseFormattedName}`] = course.status;

      const sessionsStartedName = formatSessionName(course.name, PROGRESS_STATUS.STARTED);
      const sessionsStarted = course.sessions.filter((session) => !session.completed).join('; ');
      courseData[`${sessionsStartedName}`] = sessionsStarted;
      const sessionsCompletedName = formatSessionName(course.name, PROGRESS_STATUS.COMPLETED);
      const sessionsCompleted = course.sessions.filter((session) => !!session.completed).join('; ');
      courseData[`${sessionsCompletedName}`] = sessionsCompleted;
    });
    profileData = Object.assign({}, profileData, courseData);
  }

  return profileData;
};

export const updateCrispProfileAccesses = async (
  user: IUser,
  partnerAccesses: IPartnerAccessWithPartner[],
  courses: ICoursesWithSessions[],
) => {
  const crispResponse = await getCrispPeopleData(user.email);
  const hasCrispProfile = crispResponse['reason'] === 'resolved';

  if (!!hasCrispProfile) {
    // Crisp profile exists, just update/replace PartnerAccess data
    updateCrispProfile(createCrispProfileData(user, partnerAccesses, courses), user.email);
  }

  if (!hasCrispProfile && partnerAccesses.find((pa) => !!pa.featureLiveChat)) {
    // Create new crisp profile
    addCrispProfile({
      email: user.email,
      person: { nickname: user.name },
      data: createCrispProfileData(user, partnerAccesses, courses),
    });
  }

  return 'ok';
};

export const updateCrispProfileCourse = async (
  courseName: string,
  userEmail: string,
  status: PROGRESS_STATUS,
) => {
  const courseFormattedName = formatCourseName(courseName);
  updateCrispProfile({ [`${courseFormattedName}`]: status }, userEmail);

  return 'ok';
};

export const updateCrispProfileSession = async (
  courseName: string,
  sessionName: string,
  status: PROGRESS_STATUS,
  email: string,
) => {
  const crispResponse = await getCrispPeopleData(email);
  const crispData = crispResponse.data.data.data;

  const sessionsStartedName = formatSessionName(courseName, PROGRESS_STATUS.STARTED);
  const sessionsCompletedName = formatSessionName(courseName, PROGRESS_STATUS.COMPLETED);

  const startedSessions: string[] = !!crispData[sessionsStartedName]
    ? crispData[sessionsStartedName].split('; ')
    : [];

  const completedSessions: string[] = !!crispData[sessionsCompletedName]
    ? crispData[sessionsCompletedName].split('; ')
    : [];

  const index = startedSessions.indexOf(sessionName);
  if (status === PROGRESS_STATUS.STARTED) {
    if (index === -1) {
      startedSessions.push(sessionName);
      updateCrispProfile({ [sessionsStartedName]: startedSessions.join('; ') }, email);
    }
  } else if (status === PROGRESS_STATUS.COMPLETED) {
    index !== -1 && startedSessions.splice(index, 1);
    completedSessions.push(sessionName);
    updateCrispProfile(
      {
        [sessionsStartedName]: startedSessions.join('; '),
        [sessionsCompletedName]: completedSessions.join('; '),
      },
      email,
    );
  }

  return 'ok';
};

export const getCrispPeopleData = async (email: string): Promise<AxiosResponse<CrispResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/data/${email}`,
      type: 'get',
      headers,
    });
  } catch (error) {
    throw error;
  }
};

export const addCrispProfile = async (
  newPeopleProfile: NewPeopleProfile,
): Promise<AxiosResponse<NewPeopleProfileResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/profile`,
      type: 'post',
      data: newPeopleProfile,
      headers,
    });
  } catch (error) {
    throw error;
  }
};

export const updateCrispProfile = async (
  peopleData: PeopleData,
  email: string,
): Promise<AxiosResponse<CrispResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/data/${email}`,
      type: 'patch',
      data: { data: peopleData },
      headers,
    });
  } catch (error) {
    throw error;
  }
};
