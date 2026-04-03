import { HttpStatus } from '@nestjs/common';

export type ErrorLog = {
  error: string;
  status: HttpStatus;
  errorMessage?: string;
  userId?: string;
  requestUserId?: string;
};

