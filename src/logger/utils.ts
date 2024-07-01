import { HttpStatus } from '@nestjs/common';

export type ErrorLog = {
  error: string;
  status: HttpStatus;
  errorMessage?: string;
  userId?: string;
  requestUserId?: string;
};

export type EventLog = {
  event: string;
  fields?: string[];
  userId?: string;
  requestUserId?: string;
};
