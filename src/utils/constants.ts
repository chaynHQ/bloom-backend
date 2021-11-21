import { UserEntity } from '../entities/user.entity';
import { GetUserDto } from '../user/dto/get-user.dto';

export enum PartnerAccessCodeStatusEnum {
  VALID = 'VALID',
  INVALID_CODE = 'INVALID_CODE',
  DOES_NOT_EXIST = 'DOES_NOT_EXIST',
  ALREADY_IN_USE = 'ALREADY_IN_USE',
}

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
      userObject.partnerAdmin && userObject.partnerAdmin.partner
        ? {
            id: userObject.partnerAdmin.partner.id,
            createdAt: userObject.partnerAdmin.partner.createdAt,
            updatedAt: userObject.partnerAdmin.partner.updatedAt,
            name: userObject.partnerAdmin.partner.name,
            logo: userObject.partnerAdmin.partner.logo,
            primaryColour: userObject.partnerAdmin.partner.primaryColour,
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
    partnerAdmin: userObject.partnerAdmin
      ? {
          id: userObject.partnerAdmin.id,
          createdAt: userObject.partnerAdmin.createdAt,
          updatedAt: userObject.partnerAdmin.updatedAt,
          userId: userObject.partnerAdmin.userId,
          partnerId: userObject.partnerAdmin.partnerId,
        }
      : {},
  };
};
