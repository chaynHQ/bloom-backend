import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { LANGUAGE_DEFAULT } from '../../utils/constants';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  name: string;
  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  email: string;
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  firebaseUid: string;
  @IsEnum(LANGUAGE_DEFAULT)
  @IsNotEmpty()
  @IsDefined()
  languageDefault: LANGUAGE_DEFAULT;
  @IsOptional()
  @IsString()
  partnerAccessCode?: string;
  @IsDefined()
  @IsBoolean()
  contactPermission: boolean;
}
