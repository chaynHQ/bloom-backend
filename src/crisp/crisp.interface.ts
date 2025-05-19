import { EMAIL_REMINDERS_FREQUENCY } from 'src/utils/constants';

export enum EVENT_NAME {
  CHAT_MESSAGE_SENT = 'CHAT_MESSAGE_SENT',
  CHAT_MESSAGE_RECEIVED = 'CHAT_MESSAGE_RECEIVED',
  LOGGED_IN = 'LOGGED_IN',
  LOGGED_OUT = 'LOGGED_OUT',
}

export interface CrispProfileCustomFields {
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
  course_hst?: string;
  course_hst_sessions?: string;
  course_spst?: string;
  course_spst_sessions?: string;
  course_dbr?: string;
  course_dbr_sessions?: string;
  course_iaro?: string;
  course_iaro_sessions?: string;
  course_rtar?: string;
  course_rtar_sessions?: string;
  course_rryts?: string;
  course_rryts_sessions?: string;
  course_ma?: string;
  course_ma_sessions?: string;
  course_cb?: string;
  course_cb_sessions?: string;
}
export interface CrispProfileBase {
  email?: string;
  person?: {
    nickname?: string;
    locales?: string[];
  };
  segments?: string[];
  notepad?: string;
  active?: number;
  // company?: {}
}

export interface CrispProfileBaseResponse {
  error: boolean;
  reason: string;
  data: CrispProfileBase & {
    people_id: string;
  };
}

export interface NewCrispProfileBaseResponse {
  data: CrispProfileBaseResponse;
}

export interface CrispProfileDataResponse {
  error: boolean;
  reason: string;
  data: { data: CrispProfileCustomFields };
}
