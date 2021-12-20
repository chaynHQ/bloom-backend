import { AxiosResponse } from 'axios';
import apiCall from '../apiCalls';
import {
  CrispResponse,
  NewPeopleProfile,
  NewPeopleProfileResponse,
  SavePeopleData,
} from './crisp-api.interfaces';

// https://docs.crisp.chat/references/rest-api/v1/#add-new-people-profile
// Full details needed to add a new person

const baseUrl = `https://api.crisp.chat/v1/website/${process.env.WEBSITE_TOKEN}`;

const headers = {
  Authorization: `Basic ${process.env.CRISP_TOKEN}`,
  'X-Crisp-Tier': 'plugin',
  'Content-Type': 'application/json',
};

export const addNewPeopleProfile = async (
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

export const savePeopleData = async (
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
