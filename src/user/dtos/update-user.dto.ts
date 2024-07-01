import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsEmail, IsOptional, IsString } from 'class-validator';
import { EMAIL_REMINDERS_FREQUENCY } from '../../utils/constants';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
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
  @ApiProperty({ type: String })
  signUpLanguage: string;

  @IsDate()
  @IsOptional()
  @ApiProperty({ type: 'date' })
  lastActiveAt: Date;

  @IsEmail({})
  @IsOptional()
  @ApiProperty({ type: 'email' })
  email: string;
}
