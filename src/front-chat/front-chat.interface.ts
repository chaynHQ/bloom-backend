import { EMAIL_REMINDERS_FREQUENCY } from '../utils/constants';

// PENDING  — claim row before the Mailchimp call; prevents double-send on restart.
// SENT     — Mailchimp accepted the event trigger (API 2xx). Closest to "sent" we can know.
// FAILED   — internal/API error. Retry-eligible up to UNREAD_NOTIFICATION_MAX_ATTEMPTS.
// BOUNCED  — Mailchimp bounce webhook fired. Terminal — email address is dead.
// CLEANED  — Mailchimp cleaned the address from the audience. Terminal.
export enum UNREAD_NOTIFICATION_STATUS {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  CLEANED = 'CLEANED',
}

// Front webhook event types: https://dev.frontapp.com/reference/events
export enum FRONT_WEBHOOK_EVENT_TYPE {
  INBOUND = 'inbound', // Visitor sent a message
  OUTBOUND = 'outbound', // Agent sent a message
  OUT_REPLY = 'out_reply', // Agent replied to a conversation
}

export interface FrontChatContactCustomFields {
  user_id?: string;
  signed_up_at?: string;
  last_active_at?: string;
  deleted_at?: string;
  email_reminders_frequency?: EMAIL_REMINDERS_FREQUENCY;
  language?: string;
  // Coarse client context (no IP/GPS/raw User-Agent). browser_language is the browser's
  // preferred language (navigator.language) — distinct from `language` (the account locale).
  browser_language?: string;
  timezone?: string;
  device_type?: string;
  os?: string;
  browser?: string;
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

export interface AgentReplyAttachment {
  /** Relative proxy path, e.g. /front-chat/attachment-proxy?url=... — prefix with API_URL on the client */
  url: string;
  /** Original filename — used by the widget to label the download link for `file` kind. */
  name?: string;
  kind: 'image' | 'voice' | 'file';
}

export interface AgentReplyPayload {
  id: string;
  body: string;
  authorEmail?: string;
  authorName?: string;
  /** Unix timestamp in seconds (multiply by 1000 on the frontend to get ms) */
  emittedAt: number;
  /** All files Front delivered on the message, in the order Front returned them. */
  attachments?: AgentReplyAttachment[];
}

export interface FrontChatUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface ChatHistoryMessage {
  id: string;
  direction: 'user' | 'agent';
  text: string;
  attachments?: AgentReplyAttachment[];
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
