import { UserEntity } from '../entities/user.entity';
import { GetUserDto } from '../user/dtos/get-user.dto';

const getUserCourseSessionDetails = (userObject: UserEntity) => {
  const courseObj = userObject.courseUser;
  return courseObj.map((course) => {
    return {
      id: course.course.id,
      name: course.course.name,
      slug: course.course.slug,
      status: course.course.status,
      storyblokId: course.course.storyblokId,
      completed: course.completed,
      session: course.sessionUser.map((sessionUser) => {
        return {
          id: sessionUser.session['id'],
          name: sessionUser.session['name'],
          slug: sessionUser.session['slug'],
          storyblokId: sessionUser.session['storyblokId'],
          status: sessionUser.session['status'],
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
    course: userObject.courseUser ? getUserCourseSessionDetails(userObject) : [],
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
