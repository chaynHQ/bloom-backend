import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';

export interface ITherapySession {
  id?: string;
  action?: SIMPLYBOOK_ACTION_ENUM;
  client_email?: string;
  client_id?: string;
  client_timezone?: string;
  service_name?: string;
  service_provider_name?: string;
  service_provider_email?: string;
  start_date_time?: Date;
  end_date_time?: Date;
  cancelledAt?: Date;
  rescheduledFrom?: Date;
  completedAt?: Date;
  partnerAccessId?: string;
}
