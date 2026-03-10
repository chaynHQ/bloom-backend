import { ApiProperty } from '@nestjs/swagger';
import { EMAIL_REMINDERS_FREQUENCY } from '../../utils/constants';

export class UserProfileDto {
  @ApiProperty({ description: 'The user ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'When the user was created' })
  createdAt: Date | string;

  @ApiProperty({ description: 'When the user was last updated' })
  updatedAt: Date | string;

  @ApiProperty({ description: 'When the user was soft-deleted', nullable: true })
  deletedAt: Date | string;

  @ApiProperty({ description: 'Firebase UID', required: false })
  firebaseUid?: string;

  @ApiProperty({ description: 'User display name' })
  name: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'Whether the user account is active' })
  isActive: boolean;

  @ApiProperty({ description: 'When the user was last active', nullable: true })
  lastActiveAt: Date | string;

  @ApiProperty({ description: 'Crisp token ID' })
  crispTokenId: string;

  @ApiProperty({ description: 'Whether the user is a super admin' })
  isSuperAdmin: boolean;

  @ApiProperty({ description: 'Language used at sign-up' })
  signUpLanguage: string;

  @ApiProperty({ description: 'Email reminders frequency', enum: EMAIL_REMINDERS_FREQUENCY })
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY;

  @ApiProperty({ description: 'Whether the user has given contact/marketing permission' })
  contactPermission: boolean;

  @ApiProperty({ description: 'Whether the user has given service emails permission' })
  serviceEmailsPermission: boolean;
}
