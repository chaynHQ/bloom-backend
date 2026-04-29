import { EMAIL_REMINDERS_FREQUENCY } from 'src/utils/constants';

// Front webhook event types: https://dev.frontapp.com/reference/events
export enum FRONT_WEBHOOK_EVENT_TYPE {
  INBOUND = 'inbound', // Visitor sent a message
  OUTBOUND = 'outbound', // Agent sent a message
  OUT_REPLY = 'out_reply', // Agent replied to a conversation
}

export interface FrontChatContactCustomFields {
  signed_up_at?: string;
  last_active_at?: string;
  email_reminders_frequency?: EMAIL_REMINDERS_FREQUENCY;
  language?: string;
  marketing_permission?: boolean;
  service_emails_permission?: boolean;
  partners?: string;
  feature_live_chat?: boolean;
  feature_therapy?: boolean;
  therapy_sessions_remaining?: number;
  therapy_sessions_redeemed?: number;
  therapy_session_first_at?: string;
  therapy_session_next_at?: string;
  therapy_session_last_at?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface FrontChatContactProfile {
  email?: string;
  name?: string;
}

export interface AgentReplyPayload {
  body: string;
  authorEmail?: string;
  authorName?: string;
  emittedAt: number;
}
