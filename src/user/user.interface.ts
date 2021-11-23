import { LANGUAGE_DEFAULT } from '../utils/constants';

export interface IUser {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  firebaseUid?: string;
  name: string;
  email: string;
  languageDefault: LANGUAGE_DEFAULT;
}
