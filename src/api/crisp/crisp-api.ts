import { AxiosResponse } from 'axios';
import { ICoursesWithSessions } from 'src/course/course.interface';
import { IPartnerAccessWithPartner } from 'src/partner-access/partner-access.interface';
import { IUser } from '../../user/user.interface';
import { crispToken, crispWebsiteId, PROGRESS_STATUS } from '../../utils/constants';
import apiCall from '../apiCalls';
import {
  CrispProfileResponse,
  CrispResponse,
  NewPeopleProfile,
  NewPeopleProfileResponse,
  PeopleData,
  UpdatePeopleProfile,
} from './crisp-api.interfaces';
import {
  createCrispProfileData,
  formatCourseKey,
  formatSessionKey,
} from './utils/createCrispProfileData';

const baseUrl = `https://api.crisp.chat/v1/website/${crispWebsiteId}`;

const headers = {
  Authorization: `Basic ${crispToken}`,
  'X-Crisp-Tier': 'plugin',
  '-ContentType': 'application/json',
};

export const updateCrispProfileAccesses = async (
  user: IUser,
  partnerAccesses: IPartnerAccessWithPartner[],
  courses: ICoursesWithSessions[],
) => {
  const crispDataResponse = await getCrispPeopleData(user.email);
  const hasCrispProfile =
    crispDataResponse.data?.error === false && crispDataResponse.data?.reason === 'resolved';
  const partnerSegment =
    partnerAccesses.length > 0
      ? partnerAccesses.map((pa) => pa.partner.name.toLowerCase())
      : ['public'];
  if (!!hasCrispProfile) {
    // Crisp profile exists, just update/replace PartnerAccess data
    await updateCrispProfileData(
      createCrispProfileData(user, partnerAccesses, courses),
      user.email,
    );
    const profileData = await getCrispProfile(user.email);
    const profileSegments = profileData?.data?.data?.segments;
    const segments = partnerSegment
      .concat(profileSegments ? profileSegments : [])
      // Remove duplicate segments as crisp will fail if it finds duplicates
      .filter((segment, index, array) => array.indexOf(segment) === index);
    await updateCrispProfile({ segments: segments }, user.email);
  } else {
    // Create new crisp profile
    await addCrispProfile({
      email: user.email,
      person: { nickname: user.name },
      segments: partnerSegment,
    });
    await updateCrispProfileData(
      createCrispProfileData(user, partnerAccesses, courses),
      user.email,
    );
  }

  return 'ok';
};

export const updateCrispProfileCourse = async (
  courseName: string,
  userEmail: string,
  status: PROGRESS_STATUS,
) => {
  const courseKey = formatCourseKey(courseName);
  updateCrispProfileData({ [`${courseKey}`]: status }, userEmail);

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

  const sessionsStartedKey = formatSessionKey(courseName, PROGRESS_STATUS.STARTED);
  const sessionsCompletedKey = formatSessionKey(courseName, PROGRESS_STATUS.COMPLETED);

  const startedSessions: string[] = !!crispData[sessionsStartedKey]
    ? crispData[sessionsStartedKey].split('; ')
    : [];

  const completedSessions: string[] = !!crispData[sessionsCompletedKey]
    ? crispData[sessionsCompletedKey].split('; ')
    : [];

  const index = startedSessions.indexOf(sessionName);
  if (status === PROGRESS_STATUS.STARTED) {
    if (index === -1) {
      startedSessions.push(sessionName);
      updateCrispProfileData({ [sessionsStartedKey]: startedSessions.join('; ') }, email);
    }
  } else if (status === PROGRESS_STATUS.COMPLETED) {
    index !== -1 && startedSessions.splice(index, 1);
    completedSessions.push(sessionName);
    updateCrispProfileData(
      {
        [sessionsStartedKey]: startedSessions.join('; '),
        [sessionsCompletedKey]: completedSessions.join('; '),
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
    throw error;
  }
};
export const updateCrispProfile = async (
  peopleProfile: UpdatePeopleProfile,
  email: string,
): Promise<AxiosResponse<CrispResponse>> => {
  try {
    return await apiCall({
      url: `${baseUrl}/people/profile/${email}`,
      type: 'patch',
      data: peopleProfile,
      headers,
    });
  } catch (error) {
    throw error;
  }
};
export const getCrispProfile = async (
  email: string,
): Promise<AxiosResponse<CrispProfileResponse>> => {
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

export const deleteCrispProfile = async (email: string) => {
  try {
    await apiCall({
      url: `${baseUrl}/people/profile/${email}`,
      type: 'delete',
      headers,
    });

    return 'ok';
  } catch (error) {
    throw error;
  }
};
