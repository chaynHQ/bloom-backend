import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';

export interface ITherapySession {
  id?: string;
  action?: SIMPLYBOOK_ACTION_ENUM;
  clientTimezone?: string;
  serviceName?: string;
  serviceProviderName?: string;
  serviceProviderEmail?: string;
  startDateDime?: Date;
  endDateDime?: Date;
  cancelledAt?: Date;
  rescheduledFrom?: Date;
  completedAt?: Date;
  partnerAccessId?: string;
}
