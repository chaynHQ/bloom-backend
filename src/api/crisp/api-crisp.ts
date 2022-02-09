import { AxiosResponse } from 'axios';
import { crispToken, websiteToken } from '../../utils/constants';
import apiCall from '../apiCalls';
import {
  CrispResponse,
  NewPeopleProfile,
  NewPeopleProfileResponse,
  SavePeopleData
} from './crisp-api.interfaces';

// https://docs.crisp.chat/references/rest-api/v1/#add-new-people-profile
// Full details needed to add a new person

const baseUrl = `https://api.crisp.chat/v1/website/${websiteToken}`;

const headers = {
  Authorization: `Basic ${crispToken}`,
  'X-Crisp-Tier': 'plugin',
  'Content-Type': 'application/json',
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
  savePeopleData: SavePeopleData,
  peopleId: string,
): Promise<AxiosResponse<CrispResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/data/${peopleId}`,
      type: 'put',
      data: { data: savePeopleData },
      headers,
    });
  } catch (error) {
    throw error;
  }
};
