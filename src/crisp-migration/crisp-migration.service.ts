import { Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { crispIdentifier, crispKey, crispWebsiteId } from 'src/utils/constants';
import { CrispExportService } from './crisp-export.service';
import { FrontImportService } from './front-import.service';
import { MigrationOptionsDto } from './dto/migration-options.dto';
import { MigrationProgress, MigrationResult } from './crisp-migration.interface';

const logger = new Logger('CrispMigrationService');

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// Throttle to stay well inside Crisp and Front rate limits.
const INTER_REQUEST_DELAY_MS = 300;
const INTER_CONVERSATION_DELAY_MS = 500;

@Injectable()
export class CrispMigrationService {
  // In-memory — only one migration may run at a time.
  private currentProgress: MigrationProgress | null = null;
  private migrationErrors: MigrationResult['errors'] = [];

  constructor(
    private readonly crispExport: CrispExportService,
    private readonly frontImport: FrontImportService,
  ) {}

  getStatus(): MigrationResult | null {
    if (!this.currentProgress) return null;
    return {
      success: this.currentProgress.status !== 'failed',
      progress: this.currentProgress,
      errors: this.migrationErrors,
    };
  }

  isRunning(): boolean {
    return this.currentProgress?.status === 'running';
  }

  async runMigration(options: MigrationOptionsDto): Promise<MigrationResult> {
    if (this.isRunning()) {
      throw new Error('A migration is already in progress');
    }

    this.validateEnv();

    const since = options.startDate
      ? new Date(options.startDate)
      : new Date(Date.now() - SIX_MONTHS_MS);

    this.migrationErrors = [];
    this.currentProgress = {
      totalContacts: 0,
      processedContacts: 0,
      totalConversations: 0,
      processedConversations: 0,
      totalMessages: 0,
      processedMessages: 0,
      totalAttachments: 0,
      processedAttachments: 0,
      totalNotes: 0,
      processedNotes: 0,
      errors: [],
      startedAt: new Date(),
      status: 'running',
    };

    logger.log(
      `Starting Crisp → Front migration since ${since.toISOString()} ` +
        `[dryRun=${options.dryRun ?? false}, skipAttachments=${options.skipAttachments ?? false}, ` +
        `skipNotes=${options.skipNotes ?? false}]`,
    );

    try {
      if (options.specificSessionId) {
        await this.migrateSingleConversation(options.specificSessionId, options);
      } else {
        await this.migrateAll(since, options);
      }

      this.currentProgress.status = 'completed';
      this.currentProgress.completedAt = new Date();

      const duration = Math.round(
        (this.currentProgress.completedAt.getTime() - this.currentProgress.startedAt.getTime()) /
          1000,
      );
      logger.log(
        `Migration completed in ${duration}s — ` +
          `conversations: ${this.currentProgress.processedConversations}/${this.currentProgress.totalConversations}, ` +
          `messages: ${this.currentProgress.processedMessages}, ` +
          `errors: ${this.migrationErrors.length}`,
      );
    } catch (err) {
      this.currentProgress.status = 'failed';
      this.currentProgress.completedAt = new Date();
      const message = (err as Error).message || 'Unknown error';
      logger.error(`Migration failed: ${message}`);
      this.recordError({ error: message });
    }

    return {
      success: this.currentProgress.status === 'completed',
      progress: this.currentProgress,
      errors: this.migrationErrors,
    };
  }

  // ── Private orchestration ───────────────────────────────────────────────────

  private async migrateAll(since: Date, options: MigrationOptionsDto): Promise<void> {
    logger.log('Fetching conversations from Crisp…');
    let conversations = await this.crispExport.getConversationsSince(since);

    if (options.specificEmail) {
      conversations = conversations.filter(
        (c) =>
          (c.meta?.email ?? c.email)?.toLowerCase() === options.specificEmail!.toLowerCase(),
      );
      logger.log(`Filtered to ${conversations.length} conversations for ${options.specificEmail}`);
    } else if (options.emailDomainFilter) {
      const domain = options.emailDomainFilter.toLowerCase();
      conversations = conversations.filter((c) =>
        (c.meta?.email ?? c.email)?.toLowerCase().endsWith(domain),
      );
      logger.log(
        `Filtered to ${conversations.length} conversations matching domain "${options.emailDomainFilter}"`,
      );
    }

    this.currentProgress!.totalConversations = conversations.length;
    // Pre-count unique emails as total contacts (one contact per unique email).
    const uniqueEmails = new Set(conversations.map((c) => c.meta?.email ?? c.email).filter(Boolean));
    this.currentProgress!.totalContacts = uniqueEmails.size;

    logger.log(
      `Found ${conversations.length} conversations across ${uniqueEmails.size} contacts`,
    );

    for (const conv of conversations) {
      if (!conv.session_id) continue;

      try {
        await this.migrateConversationById(conv.session_id, options);
      } catch (err) {
        const message = (err as Error).message || 'Unknown error';
        this.recordError({
          sessionId: conv.session_id,
          email: conv.meta?.email ?? conv.email,
          error: message,
        });

        if (!(options.continueOnError ?? true)) throw err;

        logger.warn(`Skipping session ${conv.session_id} after error: ${message}`);
      }

      await this.delay(INTER_CONVERSATION_DELAY_MS);
    }
  }

  private async migrateSingleConversation(
    sessionId: string,
    options: MigrationOptionsDto,
  ): Promise<void> {
    this.currentProgress!.totalConversations = 1;
    await this.migrateConversationById(sessionId, options);
  }

  private async migrateConversationById(
    sessionId: string,
    options: MigrationOptionsDto,
  ): Promise<void> {
    logger.log(`Processing conversation ${sessionId}`);

    const data = await this.crispExport.getConversationData(sessionId);
    await this.delay(INTER_REQUEST_DELAY_MS);

    this.currentProgress!.totalMessages += data.messages.length;
    this.currentProgress!.totalNotes += data.notes.length;
    this.currentProgress!.totalAttachments += data.messages.filter((m) => m.type === 'file').length;

    if (data.email && !(options.dryRun ?? false)) {
      try {
        await this.frontImport.ensureContact(data.email, data.name ?? undefined);
        this.currentProgress!.processedContacts++;
      } catch (err) {
        logger.warn(`Failed to ensure contact for ${data.email}: ${(err as Error).message}`);
      }
      await this.delay(INTER_REQUEST_DELAY_MS);
    }

    const result = await this.frontImport.importConversation(data, {
      dryRun: options.dryRun ?? false,
      skipAttachments: options.skipAttachments ?? false,
      skipNotes: options.skipNotes ?? false,
    });

    this.currentProgress!.processedConversations++;
    this.currentProgress!.processedMessages += result.messageIds.length;
    this.currentProgress!.processedNotes += result.commentIds.length;
    this.currentProgress!.processedAttachments += data.messages.filter(
      (m) => m.type === 'file',
    ).length;
  }

  private validateEnv(): void {
    const missing: string[] = [];
    if (!crispIdentifier) missing.push('CRISP_IDENTIFIER');
    if (!crispKey) missing.push('CRISP_KEY');
    if (!crispWebsiteId) missing.push('CRISP_WEBSITE_ID');
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  private recordError(entry: { sessionId?: string; email?: string; error: string }): void {
    const record = { ...entry, timestamp: new Date() };
    this.migrationErrors.push(record);
    this.currentProgress?.errors.push(record.error);
    logger.error(
      `Migration error${entry.sessionId ? ` [${entry.sessionId}]` : ''}: ${entry.error}`,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
