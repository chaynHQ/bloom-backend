import { AxiosResponse } from 'axios';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { UserEntity } from 'src/entities/user.entity';
import { serializeCourseData, serializePartnerAccessData } from 'src/utils/profileData';
import { Logger } from '../../logger/logger';
import { crispToken, crispWebsiteId } from '../../utils/constants';
import apiCall from '../apiCalls';
import {
  CrispProfileResponse,
  CrispResponse,
  NewPeopleProfile,
  NewPeopleProfileResponse,
  PeopleData,
  UpdatePeopleProfile,
} from './crisp-api.interfaces';

const baseUrl = `https://api.crisp.chat/v1/website/${crispWebsiteId}`;

const headers = {
  Authorization: `Basic ${crispToken}`,
  'X-Crisp-Tier': 'plugin',
  '-ContentType': 'application/json',
};

const logger = new Logger('UserService');

export const updateCrispProfileAccesses = async (
  user: UserEntity,
  partnerAccesses: PartnerAccessEntity[],
) => {
  updateCrispProfileData(serializePartnerAccessData(partnerAccesses), user.email);
  return 'ok';
};

export const updateCrispProfileCourse = async (email: string, courseUser: CourseUserEntity) => {
  updateCrispProfileData(serializeCourseData(courseUser), email);
  return 'ok';
};

export const getCrispPeopleData = async (email: string): Promise<AxiosResponse<CrispResponse>> => {
  return await apiCall({
    url: `${baseUrl}/people/data/${email}`,
    type: 'get',
    headers,
  });
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
    logger.error(`Could not add crisp profile for user: ${newPeopleProfile.email}`);

    throw error;
  }
};

export const updateCrispProfileData = async (
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
    logger.error(`Could not update crisp profile for user: ${email}`);

    throw error;
  }
};

export const updateCrispProfile = async (
  peopleProfile: UpdatePeopleProfile,
  email: string,
): Promise<AxiosResponse<CrispResponse>> => {
  return await apiCall({
    url: `${baseUrl}/people/profile/${email}`,
    type: 'patch',
    data: peopleProfile,
    headers,
  });
};

export const getCrispProfile = async (
  email: string,
): Promise<AxiosResponse<CrispProfileResponse>> => {
  return await apiCall({
    url: `${baseUrl}/people/profile/${email}`,
    type: 'get',
    headers,
  });
};

export const deleteCrispProfile = async (email: string) => {
  await apiCall({
    url: `${baseUrl}/people/profile/${email}`,
    type: 'delete',
    headers,
  });

  return 'ok';
};

export const deleteCypressCrispProfiles = async () => {
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

  return 'ok';
};
