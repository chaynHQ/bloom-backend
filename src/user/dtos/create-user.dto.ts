import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsOptional } from 'class-validator';
import { EMAIL_REMINDERS_FREQUENCY } from '../../utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CreateUserDto {
  @SecureInput('text', { required: true, maxLength: 50 })
  @IsDefined()
  @ApiProperty({ type: String })
  name: string;

  @SecureInput('email', { required: true, maxLength: 255 })
  @IsDefined()
  @ApiProperty({ type: String })
  email: string;

  // TODO: Add @IsStrongPassword() if needed
  @SecureInput('password', { required: true, maxLength: 128 })
  @IsDefined()
  @ApiProperty({ type: String })
  password: string;

  @SecureInput('id', { maxLength: 6 })
  @IsOptional()
  @ApiProperty({ type: String })
  partnerAccessCode?: string;

  @SecureInput('id', { maxLength: 36 })
  @IsOptional()
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

  @SecureInput('text', { required: false, maxLength: 20 })
  @ApiProperty({ type: String })
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY;

  @SecureInput('id', { maxLength: 10 })
  @IsOptional()
  @ApiProperty({ type: String })
  signUpLanguage: string;
}
