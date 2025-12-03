import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { EMAIL_REMINDERS_FREQUENCY } from '../../utils/constants';
import { SanitizeText, NormalizeEmail, TrimWhitespace, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(50, { message: 'Name is too long' })
  @SanitizeText()
  @IsNotXss()
  @ApiProperty({ type: String })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(255, { message: 'Email is too long' })
  @NormalizeEmail()
  @IsNotSqlInjection()
  @ApiProperty({ type: String })
  email: string;

  // @IsStrongPassword()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(128, { message: 'Password is too long' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @ApiProperty({ type: String })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(6, { message: 'Partner access code must be 6 characters' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  partnerAccessCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36, { message: 'Partner ID must be a valid UUID' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  partnerId?: string;

  @IsDefined()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  contactPermission: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  serviceEmailsPermission: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Language code is too long' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  signUpLanguage: string;
}
