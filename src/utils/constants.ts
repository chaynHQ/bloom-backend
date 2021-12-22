import { GetUserDto } from '../user/dtos/get-user.dto';
import { UserEntity } from '../entities/user.entity';

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

export enum SIMPLYBOOK_ACTION_ENUM {
  NEW_BOOKING = 'NEW_BOOKING',
  CANCELLED_BOOKING = 'CANCELLED_BOOKING',
}

export enum LANGUAGE_DEFAULT {
  EN = 'en',
  ES = 'es',
}

export enum PartnerAccessCodeStatusEnum {
  VALID = 'VALID',
  INVALID_CODE = 'INVALID_CODE',
  DOES_NOT_EXIST = 'DOES_NOT_EXIST',
  ALREADY_IN_USE = 'ALREADY_IN_USE',
  CODE_EXPIRED = 'CODE_EXPIRED',
}
