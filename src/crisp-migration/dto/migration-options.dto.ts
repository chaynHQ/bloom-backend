import { IsBoolean, IsOptional, IsString, IsDateString } from 'class-validator';

export class MigrationOptionsDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;

  @IsOptional()
  @IsBoolean()
  skipAttachments?: boolean = false;

  @IsOptional()
  @IsBoolean()
  skipNotes?: boolean = false;

  @IsOptional()
  @IsDateString()
  startDate?: string; // ISO 8601 date string

  @IsOptional()
  @IsString()
  specificEmail?: string; // Migrate only a specific contact

  @IsOptional()
  @IsString()
  specificSessionId?: string; // Migrate only a specific conversation

  @IsOptional()
  @IsString()
  emailDomainFilter?: string; // Only migrate contacts whose email ends with this domain e.g. "@chayn.co"

  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = true;
}

export class MigrationStatusResponseDto {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    totalContacts: number;
    processedContacts: number;
    totalConversations: number;
    processedConversations: number;
    totalMessages: number;
    processedMessages: number;
    totalAttachments: number;
    processedAttachments: number;
    totalNotes: number;
    processedNotes: number;
  };
  errors: Array<{
    sessionId?: string;
    email?: string;
    error: string;
    timestamp: Date;
  }>;
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}
