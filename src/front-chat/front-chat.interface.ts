import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { EMAIL_REMINDERS_FREQUENCY } from 'src/utils/constants';

// Front webhook event types: https://dev.frontapp.com/reference/events
export enum FRONT_WEBHOOK_EVENT_TYPE {
  INBOUND = 'inbound', // Visitor sent a message
  OUTBOUND = 'outbound', // Agent sent a message
  OUT_REPLY = 'out_reply', // Agent replied to a conversation
}

export const FRONT_WEBHOOK_EVENT_TO_EVENT_NAME: Partial<Record<string, EVENT_NAME>> = {
  [FRONT_WEBHOOK_EVENT_TYPE.INBOUND]: EVENT_NAME.CHAT_MESSAGE_SENT,
  [FRONT_WEBHOOK_EVENT_TYPE.OUTBOUND]: EVENT_NAME.CHAT_MESSAGE_RECEIVED,
  [FRONT_WEBHOOK_EVENT_TYPE.OUT_REPLY]: EVENT_NAME.CHAT_MESSAGE_RECEIVED,
};

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
  id: string;
  body: string;
  authorEmail?: string;
  authorName?: string;
  /** Unix timestamp in seconds (multiply by 1000 on the frontend to get ms) */
  emittedAt: number;
  /** Relative proxy path, e.g. /front-chat/attachment-proxy?url=... — prefix with API_URL on the client */
  attachmentUrl?: string;
  /** Original filename — used by the widget to label the download link for `file` kind. */
  attachmentName?: string;
  kind?: 'image' | 'voice' | 'file';
}

export interface FrontChatUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface ChatHistoryMessage {
  id: string;
  direction: 'user' | 'agent';
  kind?: 'image' | 'voice' | 'file';
  text: string;
  attachmentUrl?: string;
  /** Original filename — used by the widget to label the download link for `file` kind. */
  attachmentName?: string;
  authorName?: string;
  createdAt: number;
}

// ── Front API response shapes ────────────────────────────────────────────────

export interface FrontApiPaginated<T> {
  _results: T[];
  _pagination?: { next?: string | null };
}

export interface FrontApiAuthor {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface FrontApiAttachment {
  url?: string;
  filename?: string;
  content_type?: string;
}

export interface FrontApiMessage {
  id: string;
  is_inbound?: boolean;
  created_at?: number;
  body?: string;
  text?: string;
  author?: FrontApiAuthor | null;
  attachments?: FrontApiAttachment[];
}

export interface FrontApiMessageLinks {
  _links?: { related?: { conversation?: string } };
}
