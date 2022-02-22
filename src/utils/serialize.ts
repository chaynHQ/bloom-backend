import { CourseUserEntity } from 'src/entities/course-user.entity';
import { UserEntity } from '../entities/user.entity';
import { GetUserDto } from '../user/dtos/get-user.dto';

export const formatCourseUserObjects = (courseUserObjects: CourseUserEntity[]) => {
  return courseUserObjects.map((courseUser) => {
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
          storyblokId: Number(sessionUser.session.storyblokId),
          storyblokUuid: sessionUser.session.storyblokUuid,
          status: sessionUser.session.status,
          completed: sessionUser.completed,
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
      languageDefault: userObject.languageDefault,
    },
    partnerAccesses: userObject.partnerAccess
      ? userObject.partnerAccess.map((partnerAccess) => {
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
          };
        })
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
  };
};

export const crispProfileDataObject = (
  createUserResponse,
  partnerDetails,
  updatePartnerAccessResponse,
) => {
  return {
    created_at: createUserResponse.createdAt,
    updated_at: createUserResponse.updatedAt,
    language_default: createUserResponse.languageDefault,
    partners: `${partnerDetails.name}; `,
    partner_activated_at: partnerDetails.createdAt,
    feature_live_chat: updatePartnerAccessResponse.featureLiveChat,
    feature_therapy: updatePartnerAccessResponse.featureTherapy,
    therapy_sessions_remaining: updatePartnerAccessResponse.therapySessionsRemaining,
    therapy_sessions_redeemed: updatePartnerAccessResponse.therapySessionsRedeemed,
  };
};
