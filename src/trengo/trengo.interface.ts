import { EMAIL_REMINDERS_FREQUENCY } from 'src/utils/constants';

// Trengo webhook event types as defined at https://developers.trengo.com/docs/configuration
export enum TRENGO_WEBHOOK_EVENT {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  NOTE = 'NOTE',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_CLOSED = 'TICKET_CLOSED',
  TICKET_REOPENED = 'TICKET_REOPENED',
  TICKET_MERGED = 'TICKET_MERGED',
  TICKET_LABEL_ADDED = 'TICKET_LABEL_ADDED',
  TICKET_LABEL_DELETED = 'TICKET_LABEL_DELETED',
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  CONTACT_DELETED = 'CONTACT_DELETED',
}

// Base contact information for creating/updating a Trengo contact
export interface TrengoContactBase {
  email: string;
  name?: string;
  language?: string;
}

// Custom fields stored on Trengo contacts, mirroring the data previously stored in Crisp.
// Field titles in Trengo match these keys. Values are set individually via the custom fields API.
export interface TrengoContactCustomFields {
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
  // Dynamic course fields are added at runtime using the pattern:
  // course_{acronym}: string (e.g. "Started" or "Completed")
  // course_{acronym}_sessions: string (e.g. "HST:C; SPT:S")
  [key: string]: string | number | boolean | undefined;
}

// Shape of a contact returned by the Trengo REST API
export interface TrengoContactResponse {
  id: number;
  identifier: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  custom_field_values?: TrengoCustomFieldValue[];
  profile_id?: number | null;
}

// Shape of a paginated list response from Trengo
export interface TrengoPaginatedResponse<T> {
  data: T[];
  links?: {
    next: string | null;
    prev: string | null;
  };
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Shape of a custom field definition from the Trengo API
export interface TrengoCustomFieldDefinition {
  id: number;
  title: string;
  type: 'CONTACT' | 'PROFILE' | 'TICKET';
}

// Shape of a custom field value attached to a contact
export interface TrengoCustomFieldValue {
  custom_field_id: number;
  value: string;
  custom_field?: TrengoCustomFieldDefinition;
}

// Shape of a ticket from the Trengo REST API
export interface TrengoTicketResponse {
  id: number;
  contact_id: number;
  channel_id: number;
  subject: string | null;
  status: string;
  closed_at: string | null;
}

// Shape of a message within a ticket from the Trengo REST API
export interface TrengoMessageResponse {
  id: number;
  ticket_id: number;
  contact_id: number | null;
  user_id: number | null;
  message: string;
  type: string;
  channel_type: string;
}
