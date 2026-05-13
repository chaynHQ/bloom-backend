import { SIMPLYBOOK_ACTION_ENUM } from '../../utils/constants';

export class GetTherapySessionDto {
  id: string;
  action: SIMPLYBOOK_ACTION_ENUM;
  serviceName: string;
  serviceProviderName: string;
  clientTimezone: string;
  startDateTime: Date;
  endDateTime: Date;
  cancelledAt: Date;
  rescheduledFrom: Date;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
