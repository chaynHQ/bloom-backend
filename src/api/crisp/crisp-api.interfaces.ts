export interface CrispProfileCustomFields {
  signed_up_at?: string;
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
  course_pst?: string;
  course_pst_sessions?: string;
  course_dbr?: string;
  course_dbr_sessions?: string;
  course_iaro?: string;
  course_iaro_sessions?: string;
  course_rtr?: string;
  course_rtr_sessions?: string;
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
    nickname: string;
    locales: string[];
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
