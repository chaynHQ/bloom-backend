import { UserEntity } from '../entities/user.entity';
import { GetUserDto } from '../user/dtos/get-user.dto';

const getPartnerDetails = (userObject: UserEntity) => {
  const object = userObject.partnerAccess
    ? userObject.partnerAccess.partner
    : userObject.partnerAdmin.partner;

  return {
    id: object.id,
    name: object.name,
    logo: object.logo,
    primaryColour: object.primaryColour,
  };
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
    partnerAccess: userObject.partnerAccess
      ? {
          id: userObject.partnerAccess.id,
          activatedAt: userObject.partnerAccess.activatedAt,
          featureLiveChat: Boolean(userObject.partnerAccess.featureLiveChat),
          featureTherapy: Boolean(userObject.partnerAccess.featureTherapy),
          accessCode: userObject.partnerAccess.accessCode,
          therapySessionsRemaining: Number(userObject.partnerAccess.therapySessionsRemaining),
          therapySessionsRedeemed: Number(userObject.partnerAccess.therapySessionsRedeemed),
        }
      : null,
    partnerAdmin: userObject.partnerAdmin
      ? {
          id: userObject.partnerAdmin.id,
          userId: userObject.partnerAdmin.userId,
          partnerId: userObject.partnerAdmin.partnerId,
          createdAt: userObject.partnerAdmin.createdAt,
          updatedAt: userObject.partnerAdmin.updatedAt,
        }
      : null,
    courseUser: '',
    sessionUser: '',
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
