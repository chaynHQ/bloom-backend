import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { EMAIL_REMINDERS_FREQUENCY } from '../../utils/constants';
import { SanitizeText, NormalizeEmail, TrimWhitespace, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class AdminUpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Name is too long' })
  @SanitizeText()
  @IsNotXss()
  @ApiProperty({ type: String })
  name: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  contactPermission: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  serviceEmailsPermission: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY;

  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'Language code is too long' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  signUpLanguage: string;

  @IsDate()
  @IsOptional()
  @ApiProperty({ type: 'date' })
  lastActiveAt: Date;

  @IsEmail({})
  @IsOptional()
  @MaxLength(255, { message: 'Email is too long' })
  @NormalizeEmail()
  @IsNotSqlInjection()
  @ApiProperty({ type: 'email' })
  email: string;

  @IsBoolean({})
  @IsOptional()
  @ApiProperty({ type: 'boolean' })
  isSuperAdmin: boolean;
}
