import { UserEntity } from '../entities/user.entity';
import { GetUserDto } from '../user/dto/get-user.dto';

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
    partner:
      userObject.partnerAccess && userObject.partnerAccess.partner
        ? {
            id: userObject.partnerAccess.partner.id,
            createdAt: userObject.partnerAccess.partner.createdAt,
            updatedAt: userObject.partnerAccess.partner.updatedAt,
            name: userObject.partnerAccess.partner.name,
            logo: userObject.partnerAccess.partner.logo,
            primaryColour: userObject.partnerAccess.partner.primaryColour,
          }
        : {},
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
      : {},
  };
};
