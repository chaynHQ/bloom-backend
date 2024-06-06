import { AxiosResponse } from 'axios';
import { Logger } from '../../logger/logger';
import { crispToken, crispWebsiteId } from '../../utils/constants';
import apiCall from '../apiCalls';
import {
  CrispProfileBase,
  CrispProfileBaseResponse,
  CrispProfileCustomFields,
  CrispProfileDataResponse,
  NewCrispProfileBaseResponse,
} from './crisp-api.interfaces';

const baseUrl = `https://api.crisp.chat/v1/website/${crispWebsiteId}`;

const headers = {
  Authorization: `Basic ${crispToken}`,
  'X-Crisp-Tier': 'plugin',
  '-ContentType': 'application/json',
};

const logger = new Logger('UserService');

export const createCrispProfile = async (
  newPeopleProfile: CrispProfileBase,
): Promise<AxiosResponse<NewCrispProfileBaseResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/profile`,
      type: 'post',
      data: newPeopleProfile,
      headers,
    });
  } catch (error) {
    throw new Error(`Create crisp profile API call failed: ${error}`);
  }
};

// Note getCrispProfile is not currently used
export const getCrispProfile = async (
  email: string,
): Promise<AxiosResponse<CrispProfileBaseResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/profile/${email}`,
      type: 'get',
      headers,
    });
  } catch (error) {
    throw new Error(`Get crisp profile base API call failed: ${error}`);
  }
};

// Note getCrispPeopleData is not currently used
export const getCrispPeopleData = async (
  email: string,
): Promise<AxiosResponse<CrispProfileDataResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/data/${email}`,
      type: 'get',
      headers,
    });
  } catch (error) {
    throw new Error(`Get crisp profile API call failed: ${error}`);
  }
};

export const updateCrispProfileBase = async (
  peopleProfile: CrispProfileBase,
  email: string,
): Promise<AxiosResponse<CrispProfileBaseResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/profile/${email}`,
      type: 'patch',
      data: peopleProfile,
      headers,
    });
  } catch (error) {
    throw new Error(`Update crisp profile base API call failed: ${error}`);
  }
};

export const updateCrispProfile = async (
  peopleData: CrispProfileCustomFields,
  email: string,
): Promise<AxiosResponse<CrispProfileDataResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/data/${email}`,
      type: 'patch',
      data: { data: peopleData },
      headers,
    });
  } catch (error) {
    throw new Error(`Update crisp profile API call failed: ${error}`);
  }
};

export const deleteCrispProfile = async (email: string) => {
  try {
    await apiCall({
      url: `${baseUrl}/people/profile/${email}`,
      type: 'delete',
      headers,
    });
  } catch (error) {
    logger.error(`Delete crisp profile API call failed: ${error}`);
  }
};

export const deleteCypressCrispProfiles = async () => {
  try {
    const profiles = await apiCall({
      url: `${baseUrl}/people/profiles/1?search_text=cypresstestemail+`,
      type: 'get',
      headers,
    });

    profiles.data.data.forEach(async (profile) => {
      await apiCall({
        url: `${baseUrl}/people/profile/${profile.email}`,
        type: 'delete',
        headers,
      });
    });
  } catch (error) {
    throw new Error(`Delete cypress crisp profiles API call failed: ${error}`);
  }
};
