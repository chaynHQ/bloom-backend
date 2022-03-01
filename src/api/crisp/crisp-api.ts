import { AxiosResponse } from 'axios';
import { CourseUserService } from '../../course-user/course-user.service';
import { PartnerAccessEntity } from '../../entities/partner-access.entity';
import { IUser } from '../../user/user.interface';
import { crispToken, crispWebsiteId, PROGRESS_STATUS } from '../../utils/constants';
import { crispProfileDataObject } from '../../utils/serialize';
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
  user: IUser,
  partnerAccess: PartnerAccessEntity,
  totalTherapySessionsRedeemed: number,
  totalTherapySessionsRemaining: number,
  hasFeatureLiveChat: boolean,
  hasCourses: boolean,
  courseUserService: CourseUserService,
) => {
  const crispResponse = await getCrispPeopleData(user.email);
  const hasCrispProfile = crispResponse['reason'] === 'resolved';

  if (!!hasCrispProfile) {
    const crispData = crispResponse.data.data.data;
    const partners = crispData['partners'].split('; ');

    if (partners.indexOf(partnerAccess.partner.name) === -1) {
      partners.push(partnerAccess.partner.name);
    }

    const updatedCrispData = {
      partners: partners.join('; '),
      therapy_sessions_remaining:
        partnerAccess.therapySessionsRemaining + totalTherapySessionsRemaining,
      therapy_sessions_redeemed:
        partnerAccess.therapySessionsRedeemed + totalTherapySessionsRedeemed,
    };

    updateCrispProfile(updatedCrispData, user.email);
  } else if (!!hasCrispProfile && hasFeatureLiveChat === false && !partnerAccess.featureLiveChat) {
    updateCrispProfile({ feature_live_chat: false }, user.email);
  } else if (!hasCrispProfile && !!partnerAccess.featureLiveChat) {
    //Need to check if profile existed before
    addCrispProfile({
      email: user.email,
      person: { nickname: user.name },
      data: crispProfileDataObject(user, partnerAccess.partner, partnerAccess),
    });

    if (hasCourses) {
      const courseUser = await courseUserService.getCourseUserByUserId(user.id);
      courseUser.map((cu) => {
        updateCrispProfileCourse(
          cu.course.name,
          user.email,
          cu.completed ? PROGRESS_STATUS.COMPLETED : PROGRESS_STATUS.STARTED,
        );

        cu.sessionUser.map((su) => {
          updateCrispProfileSession(
            cu.course.name,
            su.session.name,
            su.completed ? PROGRESS_STATUS.COMPLETED : PROGRESS_STATUS.STARTED,
            user.email,
          );
        });
      });
    }
  }

  return 'ok';
};

export const updateCrispProfileCourse = async (
  courseName: string,
  userEmail: string,
  status: PROGRESS_STATUS,
) => {
  const courseFormattedName = formatCourseText(courseName);
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
