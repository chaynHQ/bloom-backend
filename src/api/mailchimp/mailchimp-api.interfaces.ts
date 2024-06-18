import { EMAIL_REMINDERS_FREQUENCY } from '../../utils/constants';

export enum MAILCHIMP_MERGE_FIELD_TYPES {
  TEXT = 'text',
  NUMBER = 'number',
  ADDRESS = 'address',
  PHONE = 'phone',
  DATE = 'date',
  URL = 'url',
  IMAGEURL = 'imageurl',
  RADIO = 'radio',
  DROPDOWN = 'dropdown',
  BIRTHDAY = 'birthday',
  ZIP = 'zip',
}

export interface ListMemberCustomFields {
  NAME?: string;
  SIGNUPD?: string;
  LACTIVED?: string;
  REMINDFREQ?: EMAIL_REMINDERS_FREQUENCY;
  PARTNERS?: string;
  FEATTHER?: string;
  FEATCHAT?: string;
  THERFIRSAT?: string;
  THERNEXTAT?: string;
  THERLASTAT?: string;
  THERREMAIN?: number;
  THERREDEEM?: number;
  C_HST?: string;
  C_HST_S?: string;
  C_SPST?: string;
  C_SPST_S?: string;
  C_DBR?: string;
  C_DBR_S?: string;
  C_IARO?: string;
  C_IARO_S?: string;
  C_RTAR?: string;
  C_RTAR_S?: string;
  C_RRYTS?: string;
  C_RRYTS_S?: string;
  C_MA?: string;
  C_MA_S?: string;
  C_CB?: string;
  C_CB_S?: string;
}

export interface ListMember {
  id: string;
  email_address: string;
  unique_email_id: string;
  contact_id: string;
  full_name: string;
  web_id: 0;
  email_type: string;
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
  unsubscribe_reason: string;
  consents_to_one_to_one_messaging: true;
  merge_fields: ListMemberCustomFields;
  interests: null;
  stats: {
    avg_open_rate: 0;
    avg_click_rate: 0;
    ecommerce_data: {
      total_revenue: 0;
      number_of_orders: 0;
      currency_code: string;
    };
  };
  ip_signup: string;
  timestamp_signup: string;
  ip_opt: string;
  timestamp_opt: string;
  member_rating: 0;
  last_changed: string;
  language: string;
  vip: true;
  email_client: string;
  location: {
    latitude: 0;
    longitude: 0;
    gmtoff: 0;
    dstoff: 0;
    country_code: string;
    timezone: string;
    region: string;
  };
  marketing_permissions: [
    {
      marketing_permission_id: string;
      text: string;
      enabled: true;
    },
  ];
  last_note: {
    note_id: number;
    created_at: string;
    created_by: string;
    note: string;
  };
  source: string;
  tags_count: 0;
  tags: [
    {
      id: number;
      name: string;
    },
  ];
  list_id: string;
  _links: [
    {
      rel: string;
      href: string;
      method: 'GET';
      targetSchema: string;
      schema: string;
    },
  ];
}

export interface UpdateListMemberRequest {
  email_address: string;
  email_type: string;
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
  merge_fields: ListMemberCustomFields;
  interests: null;
  ip_signup: string;
  timestamp_signup: string;
  ip_opt: string;
  timestamp_opt: string;
  language: string;
  vip: boolean;
  location: {
    latitude: 0;
    longitude: 0;
    gmtoff: 0;
    dstoff: 0;
    country_code: string;
    timezone: string;
    region: string;
  };
}

export type ListMemberPartial = Partial<UpdateListMemberRequest>;
