import { PartnerEntity } from 'src/entities/partner.entity';
import { IPartnerFeature } from 'src/partner-feature/partner-feature.interface';
import { IPartner } from 'src/partner/partner.interface';
import { CourseUserEntity } from '../entities/course-user.entity';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';
import { TherapySessionEntity } from '../entities/therapy-session.entity';
import { UserEntity } from '../entities/user.entity';
import { ZapierSimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
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
      partner: formatPartnerObject(partnerAccess.partner),
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
          partner: formatPartnerObject(userObject.partnerAdmin.partner),
        }
      : null,
    courses: userObject.courseUser ? formatCourseUserObjects(userObject.courseUser) : [],
    subscriptions:
      userObject.subscriptionUser && userObject.subscriptionUser.length > 0
        ? formatSubscriptionObjects(userObject.subscriptionUser)
        : [],
  };
};

export const formatPartnerObject = (partnerObject: PartnerEntity): IPartner => {
  return {
    name: partnerObject.name,
    id: partnerObject.id,
    partnerFeature: partnerObject.partnerFeature
      ? partnerObject.partnerFeature.map<IPartnerFeature>((pf) => {
          return {
            partnerId: pf.id,
            featureId: pf.featureId,
            feature: pf.feature,
            active: pf.active,
          };
        })
      : [],
  };
};

export const formatTherapySessionObject = (
  therapySession: ZapierSimplybookBodyDto,
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
    startDateTime: new Date(therapySession.start_date_time),
    endDateTime: new Date(therapySession.end_date_time),
    cancelledAt: null,
    rescheduledFrom: null,
    completedAt: null,
    partnerAccessId,
    userId: therapySession.client_id,
  };
};

export const formatSubscriptionObjects = (
  userSubscriptions: SubscriptionUserEntity[],
): ISubscriptionUser[] => {
  return userSubscriptions.map((userSubscription) => formatSubscriptionObject(userSubscription));
};

export const formatSubscriptionObject = (
  userSubscription: SubscriptionUserEntity,
): ISubscriptionUser => {
  return {
    id: userSubscription.id,
    subscriptionId: userSubscription.subscriptionId,
    subscriptionName: userSubscription.subscription.name,
    subscriptionInfo: userSubscription.subscriptionInfo,
    createdAt: userSubscription.createdAt,
    cancelledAt: userSubscription.cancelledAt,
  };
};
