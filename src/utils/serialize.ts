import { UserEntity } from '../entities/user.entity';
import { GetUserDto } from '../user/dtos/get-user.dto';

const getUserCourseSessionDetails = (userObject: UserEntity) => {
  const courseUserObjects = userObject.courseUser;
  return courseUserObjects.map((courseUser) => {
    return {
      id: courseUser.course.id,
      name: courseUser.course.name,
      slug: courseUser.course.slug,
      status: courseUser.course.status,
      storyblokId: courseUser.course.storyblokId,
      completed: courseUser.completed,
      sessions: courseUser.course.session?.map((session) => {
        return {
          id: session.id,
          name: session.name,
          slug: session.slug,
          storyblokId: session.storyblokId,
          status: session.status,
          completed: session.sessionUser[0].completed,
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
    partnerAccesses: userObject.partnerAccess.map((partnerAccess) => {
      return {
        id: partnerAccess.id,
        activatedAt: partnerAccess.activatedAt,
        featureLiveChat: Boolean(partnerAccess.featureLiveChat),
        featureTherapy: Boolean(partnerAccess.featureTherapy),
        accessCode: partnerAccess.accessCode,
        therapySessionsRemaining: Number(partnerAccess.therapySessionsRemaining),
        therapySessionsRedeemed: Number(partnerAccess.therapySessionsRedeemed),
        partner: partnerAccess.partner,
      };
    }),
    partnerAdmin: userObject.partnerAdmin
      ? {
          id: userObject.partnerAdmin.id,
          userId: userObject.partnerAdmin.userId,
          partnerId: userObject.partnerAdmin.partnerId,
          createdAt: userObject.partnerAdmin.createdAt,
          updatedAt: userObject.partnerAdmin.updatedAt,
          partner: userObject.partnerAdmin.partner,
        }
      : null,
    courses: userObject.courseUser ? getUserCourseSessionDetails(userObject) : [],
  };
};

export const getCrispUserData = (
  createUserResponse,
  partnerDetails,
  updatePartnerAccessResponse,
) => {
  return {
    createdAt: createUserResponse.createdAt,
    updatedAt: createUserResponse.updatedAt,
    languageDefault: createUserResponse.languageDefault,
    partner: partnerDetails.name,
    partner_activated_at: partnerDetails.createdAt,
    feature_live_chat: updatePartnerAccessResponse.featureLiveChat,
    feature_therapy: updatePartnerAccessResponse.featureTherapy,
    therapy_sessions_remaining: updatePartnerAccessResponse.therapySessionsRemaining,
    therapy_sessions_redeemed: updatePartnerAccessResponse.therapySessionsRedeemed,
  };
};
