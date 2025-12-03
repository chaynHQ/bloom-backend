import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';
import { EMAIL_REMINDERS_FREQUENCY } from '../../utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class UpdateUserDto {
  @SecureInput('text', { required: false, maxLength: 50 })
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

  @SecureInput('text', { required: false, maxLength: 20 })
  @ApiProperty({ type: String })
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY;

  @SecureInput('id', { required: false, maxLength: 10 })
  @ApiProperty({ type: String })
  signUpLanguage: string;

  @IsDate()
  @IsOptional()
  @ApiProperty({ type: 'date' })
  lastActiveAt: Date;

  @SecureInput('email', { required: false, maxLength: 255 })
  @ApiProperty({ type: 'email' })
  email: string;
}
