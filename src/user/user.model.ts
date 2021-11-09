import { LANGUAGE_DEFAULT } from 'src/entities/user.entity';

export interface IUser {
  id: string;
  name: string;
  email: string;
  languageDefault?: LANGUAGE_DEFAULT;
}
