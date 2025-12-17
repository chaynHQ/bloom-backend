import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';
import { EMAIL_REMINDERS_FREQUENCY } from '../../utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class AdminUpdateUserDto {
  @SecureInput('text', { required: false, maxLength: 50 })
  @ApiProperty({ type: String })
  name: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  contactPermission: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  serviceEmailsPermission: boolean;

  @SecureInput('text', { required: false, maxLength: 20 })
  @ApiProperty({ type: String })
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY;

  @SecureInput('text', { required: false, maxLength: 10 })
  @ApiProperty({ type: String })
  signUpLanguage: string;

  @IsOptional()
  @IsDate()
  @ApiProperty({ type: Date })
  lastActiveAt: Date;

  @SecureInput('email', { required: false, maxLength: 255 })
  @ApiProperty({ type: String, format: 'email' })
  email: string;

  @IsOptional()
  @IsBoolean({})
  @ApiProperty({ type: Boolean })
  isSuperAdmin: boolean;
}
