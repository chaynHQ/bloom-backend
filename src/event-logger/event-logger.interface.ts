export enum EVENT_NAME {
  CHAT_MESSAGE_SENT = 'CHAT_MESSAGE_SENT',
  LOGGED_IN = 'LOGGED_IN',
  LOGGED_OUT = 'LOGGED_OUT',
}

export interface ICreateEventLog {
  date: Date | string;
  event: EVENT_NAME;
  userId: string;
}
