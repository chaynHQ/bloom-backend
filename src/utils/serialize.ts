import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { IPartnerFeature } from 'src/partner-feature/partner-feature.interface';
import { IPartner } from 'src/partner/partner.interface';
import { GetSubscriptionUserDto } from 'src/subscription-user/dto/get-subscription-user.dto';
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
    storyblokUuid: courseUser.course.storyblokUuid,
    completed: courseUser.completed,
    sessions: courseUser.sessionUser?.map((sessionUser) => {
      return {
        id: sessionUser.session.id,
        createdAt: sessionUser.createdAt,
        updatedAt: sessionUser.updatedAt,
        name: sessionUser.session.name,
        slug: sessionUser.session.slug,
        storyblokUuid: sessionUser.session.storyblokUuid,
        status: sessionUser.session.status,
        completed: sessionUser.completed,
      };
    }),
  };
};

export const formatResourceUserObject = (resourceUsers: ResourceUserEntity[]) => {
  return resourceUsers.map((resourceUser) => {
    return {
      id: resourceUser.resource.id,
      createdAt: resourceUser.createdAt,
      updatedAt: resourceUser.updatedAt,
      name: resourceUser.resource.name,
      slug: resourceUser.resource.slug,
      status: resourceUser.resource.status,
      storyblokUuid: resourceUser.resource.storyblokUuid,
      completed: !!resourceUser.completedAt, // convert to boolean from data populated
    };
  });
};

export const formatPartnerAdminObjects = (partnerAdminObject: PartnerAdminEntity) => {
  return {
    id: partnerAdminObject.id,
    active: partnerAdminObject.active,
    createdAt: partnerAdminObject.createdAt,
    updatedAt: partnerAdminObject.updatedAt,
    partner: partnerAdminObject.partner ? formatPartnerObject(partnerAdminObject.partner) : null,
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
      partner: partnerAccess.partner ? formatPartnerObject(partnerAccess.partner) : null,
      therapySessions:
        partnerAccess.therapySession?.length === 0
          ? []
          : partnerAccess.therapySession?.map((ts) => {
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
      deletedAt: userObject.deletedAt,
      name: userObject.name,
      email: userObject.email,
      firebaseUid: userObject.firebaseUid,
      isActive: userObject.isActive,
      lastActiveAt: userObject.lastActiveAt,
      crispTokenId: userObject.crispTokenId,
      isSuperAdmin: userObject.isSuperAdmin,
      signUpLanguage: userObject.signUpLanguage,
      emailRemindersFrequency: userObject.emailRemindersFrequency,
      contactPermission: userObject.contactPermission,
      serviceEmailsPermission: userObject.serviceEmailsPermission,
    },
    partnerAccesses: userObject.partnerAccess
      ? formatPartnerAccessObjects(userObject.partnerAccess)
      : null,
    partnerAdmin: userObject.partnerAdmin
      ? formatPartnerAdminObjects(userObject.partnerAdmin)
      : null,
    resources: userObject.resourceUser ? formatResourceUserObject(userObject.resourceUser) : [],
    subscriptions:
      userObject.subscriptionUser && userObject.subscriptionUser.length > 0
        ? formatSubscriptionObjects(userObject.subscriptionUser)
        : [],
  };
};

// Use if you don't want loads of null keys on the object and have only what you want to
export const formatGetUsersObject = (userObject: UserEntity): GetUserDto => {
  return {
    user: {
      id: userObject.id,
      createdAt: userObject.createdAt,
      updatedAt: userObject.updatedAt,
      deletedAt: userObject.deletedAt,
      name: userObject.name,
      email: userObject.email,
      firebaseUid: userObject.firebaseUid,
      isActive: userObject.isActive,
      lastActiveAt: userObject.lastActiveAt,
      crispTokenId: userObject.crispTokenId,
      isSuperAdmin: userObject.isSuperAdmin,
      signUpLanguage: userObject.signUpLanguage,
      emailRemindersFrequency: userObject.emailRemindersFrequency,
      contactPermission: userObject.contactPermission,
      serviceEmailsPermission: userObject.serviceEmailsPermission,
    },
    ...(userObject.partnerAccess
      ? {
          partnerAccesses: userObject.partnerAccess
            ? formatPartnerAccessObjects(userObject.partnerAccess)
            : null,
        }
      : {}),
    ...(userObject.partnerAdmin ? formatPartnerAdminObjects(userObject.partnerAdmin) : {}),
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

export const serializeZapierSimplyBookDtoToTherapySessionEntity = (
  therapySession: ZapierSimplybookBodyDto,
  partnerAccess: PartnerAccessEntity,
): Partial<TherapySessionEntity> => {
  return {
    action: therapySession.action,
    bookingCode: therapySession.booking_code,
    clientEmail: therapySession.client_email,
    clientTimezone: therapySession.client_timezone,
    serviceName: therapySession.service_name,
    serviceProviderName: therapySession.service_provider_name,
    serviceProviderEmail: therapySession.service_provider_email,
    startDateTime: new Date(therapySession.start_date_time),
    endDateTime: new Date(therapySession.end_date_time),
    cancelledAt: null,
    rescheduledFrom: null,
    completedAt: null,
    partnerAccessId: partnerAccess.id,
    userId: partnerAccess.userId,
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

export const mapToSubscriptionUserDtos = (
  userSubscriptions: SubscriptionUserEntity[],
): GetSubscriptionUserDto[] => {
  return userSubscriptions.map((subscriptionUser) => {
    const dto = new GetSubscriptionUserDto();
    dto.id = subscriptionUser.id;
    dto.subscriptionId = subscriptionUser.subscription.id;
    dto.subscriptionName = subscriptionUser.subscription.name;
    dto.subscriptionInfo = subscriptionUser.subscription.info;
    dto.createdAt = subscriptionUser.createdAt;
    dto.cancelledAt = subscriptionUser.cancelledAt;
    dto.subscriptionInfo = subscriptionUser.subscriptionInfo;
    return dto;
  });
};
