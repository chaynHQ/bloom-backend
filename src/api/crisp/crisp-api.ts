import { AxiosResponse } from 'axios';
import { IPartnerAccessWithPartner } from 'src/partner-access/partner-access.interface';
import { crispToken, PROGRESS_STATUS, website_id } from '../../utils/constants';
import apiCall from '../apiCalls';
import {
  CrispResponse,
  NewPeopleProfile,
  NewPeopleProfileResponse,
  PeopleData,
} from './crisp-api.interfaces';

// https://docs.crisp.chat/references/rest-api/v1/#add-new-people-profile
// Full details needed to add a new person

const baseUrl = `https://api.crisp.chat/v1/website/${website_id}`;

const headers = {
  Authorization: `Basic ${crispToken}`,
  'X-Crisp-Tier': 'plugin',
  '-ContentType': 'application/json',
};

const formatText = (text: string) => {
  return `course_${text.replace(/,?\s+/g, '_').toLowerCase()}`;
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
    const courseFormattedName = formatText(courseName);
    await updateCrispProfile({ [`${courseFormattedName}`]: status }, userEmail);
  }
};

export const getCrispProfile = async (email: string): Promise<AxiosResponse<CrispResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/profile/${email}`,
      type: 'get',
      headers,
    });
  } catch (error) {
    throw error;
  }
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
