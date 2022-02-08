import { AxiosResponse } from 'axios';
import { IPartnerAccessWithPartner } from 'src/partner-access/partner-access.interface';
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

const formatCourseText = (courseName: string) => {
  return `course_${getAcronym(courseName)}_status`;
};

const fomrmatSessionText = (courseName: string, status: PROGRESS_STATUS) => {
  return `course_${getAcronym(courseName)}_sessions_${status.toLowerCase()}`;
};

export const updateCrispProfileCourse = async (
  partnerAccesses: IPartnerAccessWithPartner[],
  courseName: string,
  userEmail: string,
  status: PROGRESS_STATUS,
) => {
  const featureLiveChat = !!partnerAccesses.find(function (partnerAccess) {
    return partnerAccess.featureLiveChat === true;
  });

  if (featureLiveChat) {
    const courseFormattedName = formatCourseText(courseName);
    return await updateCrispProfile({ [`${courseFormattedName}`]: status }, userEmail);
  }

  return;
};

export const updateCrispProfileSession = async (
  courseName: string,
  sessionName: string,
  status: PROGRESS_STATUS,
  email: string,
) => {
  const crispData = await getCrispPeopleData(email);

  const sessionStartedFormattedName = fomrmatSessionText(courseName, PROGRESS_STATUS.STARTED);
  const sessionCompletedFormattedName = fomrmatSessionText(courseName, PROGRESS_STATUS.COMPLETED);

  const startedSessions: string[] = !!crispData.data.data?.data[`${sessionStartedFormattedName}`]
    ? crispData.data.data?.data[`${sessionStartedFormattedName}`].split('; ')
    : [];

  const completedSessions: string[] = !!crispData.data.data?.data[
    `${sessionCompletedFormattedName}`
  ]
    ? crispData.data.data.data[`${sessionCompletedFormattedName}`].split('; ')
    : [];

  const index = startedSessions.indexOf(sessionName);
  if (status === PROGRESS_STATUS.STARTED) {
    if (index === -1) {
      startedSessions.push(sessionName);
      await updateCrispProfile(
        { [`${sessionStartedFormattedName}`]: startedSessions.join('; ') },
        email,
      );
    }
  } else if (status === PROGRESS_STATUS.COMPLETED) {
    startedSessions.splice(index, 1);
    completedSessions.push(sessionName);
    await updateCrispProfile(
      { [`${sessionStartedFormattedName}`]: startedSessions.join('; ') },
      email,
    );
    await updateCrispProfile(
      {
        [`${sessionCompletedFormattedName}`]: completedSessions.join('; '),
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
