import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ type: String })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  email: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  firebaseUid: string;

  @IsEnum(LANGUAGE_DEFAULT)
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  languageDefault: LANGUAGE_DEFAULT;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  partnerAccessCode?: string;

  @IsDefined()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  contactPermission: boolean;
}
