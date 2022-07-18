import { PartialFuncReturn } from '@golevelup/ts-jest';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CourseRepository } from 'src/course/course.repository';
import { CourseEntity } from 'src/entities/course.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { SessionRepository } from 'src/session/session.repository';
import { mockCourse, mockSession } from './mockData';

export const mockSessionRepositoryMethods: PartialFuncReturn<SessionRepository> = {
  findOne: async () => {
    return mockSession;
  },
  save: async (entity) => {
    return entity as SessionEntity;
  },
  create: () => {
    return mockSession;
  },
};

export const mockCourseRepositoryMethods: PartialFuncReturn<CourseRepository> = {
  findOne: async () => {
    return mockCourse;
  },
  create: () => {
    return mockCourse;
  },
  save: async (entity) => {
    return entity as CourseEntity;
  },
};

export const mockCoursePartnerRepositoryMethods: PartialFuncReturn<CoursePartnerService> = {
  updateCoursePartners: async () => {
    return [];
  },
};
