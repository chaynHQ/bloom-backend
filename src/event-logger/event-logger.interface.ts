export enum EVENT_NAME {
  CHAT_MESSAGE_SENT = 'CHAT_MESSAGE_SENT',
  CHAT_MESSAGE_RECEIVED = 'CHAT_MESSAGE_RECEIVED',
  LOGGED_IN = 'LOGGED_IN',
  LOGGED_OUT = 'LOGGED_OUT',
}

export interface ICreateEventLog {
  email?: string;
  userId?: string;
  date: Date | string;
  event: EVENT_NAME;
}
