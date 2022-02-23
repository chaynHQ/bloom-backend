import { AxiosResponse } from 'axios';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
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

const formatSessionText = (courseName: string, status: PROGRESS_STATUS) => {
  return `course_${getAcronym(courseName)}_sessions_${status.toLowerCase()}`;
};

export const updateCrispProfileAccess = async (
  email: string,
  partnerAccess: PartnerAccessEntity,
  totalTherapySessionsRedeemed: number,
  totalTherapySessionsRemaining: number,
) => {
  const crispResponse = await getCrispPeopleData(email);
  const crispData = crispResponse.data.data.data;
  const partners = crispData['partners'].split('; ');

  if (partners.indexOf(partnerAccess.partner.name) === -1) {
    partners.push(partnerAccess.partner.name);
  }

  const updatedCrispData = {
    partners: partners.join('; '),
    therapy_sessions_remaining:
      partnerAccess.therapySessionsRemaining + totalTherapySessionsRemaining,
    therapy_sessions_redeemed: partnerAccess.therapySessionsRedeemed + totalTherapySessionsRedeemed,
  };

  updateCrispProfile(updatedCrispData, email);

  return;
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
    updateCrispProfile({ [`${courseFormattedName}`]: status }, userEmail);
  }

  return;
};

export const updateCrispProfileSession = async (
  courseName: string,
  sessionName: string,
  status: PROGRESS_STATUS,
  email: string,
) => {
  const crispResponse = await getCrispPeopleData(email);
  const crispData = crispResponse.data.data.data;

  const sessionStartedFormattedName = formatSessionText(courseName, PROGRESS_STATUS.STARTED);
  const sessionCompletedFormattedName = formatSessionText(courseName, PROGRESS_STATUS.COMPLETED);

  const startedSessions: string[] = !!crispData[sessionStartedFormattedName]
    ? crispData[sessionStartedFormattedName].split('; ')
    : [];

  const completedSessions: string[] = !!crispData[sessionCompletedFormattedName]
    ? crispData[sessionCompletedFormattedName].split('; ')
    : [];

  const index = startedSessions.indexOf(sessionName);
  if (status === PROGRESS_STATUS.STARTED) {
    if (index === -1) {
      startedSessions.push(sessionName);
      updateCrispProfile({ [sessionStartedFormattedName]: startedSessions.join('; ') }, email);
    }
  } else if (status === PROGRESS_STATUS.COMPLETED) {
    index !== -1 && startedSessions.splice(index, 1);
    completedSessions.push(sessionName);
    updateCrispProfile(
      {
        [sessionStartedFormattedName]: startedSessions.join('; '),
        [sessionCompletedFormattedName]: completedSessions.join('; '),
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
