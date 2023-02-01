import moment from 'moment';
import { CourseUserEntity } from '../entities/course-user.entity';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';
import { TherapySessionEntity } from '../entities/therapy-session.entity';
import { UserEntity } from '../entities/user.entity';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { ISubscriptionUser } from '../subscription-user/subscription-user.interface';
import { GetUserDto } from '../user/dtos/get-user.dto';

export const formatCourseUserObjects = (courseUserObjects: CourseUserEntity[]) => {
  return courseUserObjects.map((courseUser) => formatCourseUserObject(courseUser));
};

export const formatCourseUserObject = (courseUser: CourseUserEntity) => {
  return {
    id: courseUser.course.id,
    createdAt: courseUser.createdAt,
    updatedAt: courseUser.updatedAt,
    name: courseUser.course.name,
    slug: courseUser.course.slug,
    status: courseUser.course.status,
    storyblokId: courseUser.course.storyblokId,
    storyblokUuid: courseUser.course.storyblokUuid,
    completed: courseUser.completed,
    sessions: courseUser.sessionUser?.map((sessionUser) => {
      return {
        id: sessionUser.session.id,
        createdAt: sessionUser.createdAt,
        updatedAt: sessionUser.updatedAt,
        name: sessionUser.session.name,
        slug: sessionUser.session.slug,
        storyblokId: sessionUser.session.storyblokId,
        storyblokUuid: sessionUser.session.storyblokUuid,
        status: sessionUser.session.status,
        completed: sessionUser.completed,
      };
    }),
  };
};

export const formatPartnerAccessObjects = (partnerAccessObjects: PartnerAccessEntity[]) => {
  return partnerAccessObjects.map((partnerAccess) => {
    return {
      id: partnerAccess.id,
      createdAt: partnerAccess.createdAt,
      updatedAt: partnerAccess.updatedAt,
      activatedAt: partnerAccess.activatedAt,
      featureLiveChat: partnerAccess.featureLiveChat,
      featureTherapy: partnerAccess.featureTherapy,
      accessCode: partnerAccess.accessCode,
      active: partnerAccess.active,
      therapySessionsRemaining: partnerAccess.therapySessionsRemaining,
      therapySessionsRedeemed: partnerAccess.therapySessionsRedeemed,
      partner: partnerAccess.partner,
      therapySessions: partnerAccess.therapySession?.map((ts) => {
        return {
          id: ts.id,
          action: ts.action,
          clientTimezone: ts.clientTimezone,
          serviceName: ts.serviceName,
          serviceProviderName: ts.serviceProviderName,
          serviceProviderEmail: ts.serviceProviderEmail,
          startDateTime: ts.startDateTime,
          endDateTime: ts.endDateTime,
          cancelledAt: ts.cancelledAt,
          rescheduledFrom: ts.rescheduledFrom,
          completedAt: ts.completedAt,
        };
      }),
    };
  });
};

export const formatUserObject = (userObject: UserEntity): GetUserDto => {
  return {
    user: {
      id: userObject.id,
      createdAt: userObject.createdAt,
      updatedAt: userObject.updatedAt,
      name: userObject.name,
      email: userObject.email,
      firebaseUid: userObject.firebaseUid,
      isActive: userObject.isActive,
      crispTokenId: userObject.crispTokenId,
      isSuperAdmin: userObject.isSuperAdmin,
    },
    partnerAccesses: userObject.partnerAccess
      ? formatPartnerAccessObjects(userObject.partnerAccess)
      : null,
    partnerAdmin: userObject.partnerAdmin
      ? {
          id: userObject.partnerAdmin.id,
          createdAt: userObject.partnerAdmin.createdAt,
          updatedAt: userObject.partnerAdmin.updatedAt,
          partner: userObject.partnerAdmin.partner,
        }
      : null,
    courses: userObject.courseUser ? formatCourseUserObjects(userObject.courseUser) : [],
    subscriptions:
      userObject.subscriptionUser.length > 0
        ? formatSubscriptionObjects(userObject.subscriptionUser)
        : [],
  };
};

export const formatTherapySessionObject = (
  therapySession: SimplybookBodyDto,
  partnerAccessId: string,
): Partial<TherapySessionEntity> => {
  return {
    action: therapySession.action,
    bookingCode: therapySession.booking_code,
    clientEmail: therapySession.client_email,
    clientTimezone: therapySession.client_timezone,
    serviceName: therapySession.service_name,
    serviceProviderName: therapySession.service_provider_email,
    serviceProviderEmail: therapySession.service_provider_email,
    startDateTime: moment(therapySession.start_date_time).toDate(),
    endDateTime: moment(therapySession.end_date_time).toDate(),
    cancelledAt: null,
    rescheduledFrom: null,
    completedAt: null,
    partnerAccessId,
  };
};

export const formatSubscriptionObjects = (
  userSubscriptions: SubscriptionUserEntity[],
): ISubscriptionUser[] => {
  return userSubscriptions.map((userSubscription) => ({
    subscriptionId: userSubscription.id,
    subscriptionName: userSubscription.subscription.name,
    subscriptionInfo: userSubscription.subscriptionInfo,
    createdAt: userSubscription.createdAt,
    cancelledAt: userSubscription.cancelledAt,
  }));
};
