import { LANGUAGE_DEFAULT } from '../entities/user.entity';

export interface IUser {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  firebaseUid?: string;
  name: string;
  email: string;
  languageDefault: LANGUAGE_DEFAULT;
}
