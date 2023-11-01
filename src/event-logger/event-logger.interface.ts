export enum EVENT_NAME {
  CHAT_MESSAGE_SENT = 'CHAT_MESSAGE_SENT',
}

export interface ICreateEventLog {
  date: Date | string;
  event: EVENT_NAME;
  userId: string;
}
