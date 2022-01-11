import { UserEntity } from '../entities/user.entity';
import { GetUserDto } from '../user/dtos/get-user.dto';

const getPartnerDetails = (userObject: UserEntity) => {
  if (!userObject.partnerAccess.length) {
    return [
      {
        id: userObject.partnerAdmin.partner.id,
        name: userObject.partnerAdmin.partner.name,
        logo: userObject.partnerAdmin.partner.logo,
        primaryColour: userObject.partnerAdmin.partner.primaryColour,
      },
    ];
  }
  return userObject.partnerAccess.map(({ partner }) => {
    return {
      id: partner.id,
      name: partner.name,
      logo: partner.logo,
      primaryColour: partner.primaryColour,
    };
  });
};

const getUserCourseSessionDetails = (userObject: UserEntity) => {
  const courseObj = userObject.courseUser;
  return courseObj.map((course) => {
    return {
      id: course.course.id,
      name: course.course.name,
      slug: course.course.slug,
      status: course.course.status,
      storyblokid: course.course.storyblokid,
      completed: course.completed,
      session: course.course.session.map((session) => {
        return {
          id: session.id,
          name: session.name,
          slug: session.slug,
          storyblokid: session.storyblokid,
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
    partner: getPartnerDetails(userObject),
    partnerAccess: userObject.partnerAccess.map((partnerAccess) => {
      return {
        id: partnerAccess.id,
        activatedAt: partnerAccess.activatedAt,
        featureLiveChat: Boolean(partnerAccess.featureLiveChat),
        featureTherapy: Boolean(partnerAccess.featureTherapy),
        accessCode: partnerAccess.accessCode,
        therapySessionsRemaining: Number(partnerAccess.therapySessionsRemaining),
        therapySessionsRedeemed: Number(partnerAccess.therapySessionsRedeemed),
      };
    }),
    partnerAdmin: userObject.partnerAdmin
      ? {
          id: userObject.partnerAdmin.id,
          userId: userObject.partnerAdmin.userId,
          partnerId: userObject.partnerAdmin.partnerId,
          createdAt: userObject.partnerAdmin.createdAt,
          updatedAt: userObject.partnerAdmin.updatedAt,
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
