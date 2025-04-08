export enum EVENT_NAME {
  CHAT_MESSAGE_SENT = 'CHAT_MESSAGE_SENT',
  CHAT_MESSAGE_RECEIVED = 'CHAT_MESSAGE_RECEIVED',
  LOGGED_IN = 'LOGGED_IN',
  LOGGED_OUT = 'LOGGED_OUT',
  GROUNDING_EXERCISE_STARTED = 'GROUNDING_EXERCISE_STARTED',
}

export interface CreateEventLog {
  email?: string;
  userId?: string;
  date: Date | string;
  event: EVENT_NAME;
  metadata?: EventLogMetadata;
}

export interface EventLogMetadata {
  title?: string;
}
