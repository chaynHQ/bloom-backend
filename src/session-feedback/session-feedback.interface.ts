import { ISession } from 'src/session/session.interface';

export interface ISessionFeedback {
  createdAt?: Date | string;
  updatedAt?: Date | string;
  id?: string;
  session?: ISession;
  feedbackTags?: string;
  feedbackDescription?: string;
}
