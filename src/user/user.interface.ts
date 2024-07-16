import { EMAIL_REMINDERS_FREQUENCY } from '../utils/constants';

export interface IUser {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  firebaseUid?: string;
  name: string;
  email: string;
  isActive: boolean;
  lastActiveAt: Date | string;
  crispTokenId: string;
  isSuperAdmin: boolean;
  signUpLanguage: string;
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY;
}
