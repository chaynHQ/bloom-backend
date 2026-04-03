export class CreateSessionUserRecordDto {
  sessionId: string;
  courseUserId: string;
  completed: boolean;
  completedAt?: Date | null;
}
