import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/entities/user.entity';
import { Logger } from 'src/logger/logger';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { crispIdentifier, crispKey, crispWebsiteId } from 'src/utils/constants';
import { ILike, Repository } from 'typeorm';
import { FrontChatService } from 'src/front-chat/front-chat.service';
import { CrispExportService } from './crisp-export.service';
import { MigrationOptionsDto } from './dto/migration-options.dto';
import { CrispConversation, MigrationProgress, MigrationResult } from './crisp-migration.interface';
import { FrontImportService } from './front-import.service';

const logger = new Logger('CrispMigrationService');

const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000;

const INTER_REQUEST_DELAY_MS = 300;

@Injectable()
export class CrispMigrationService {
  private currentProgress: MigrationProgress | null = null;
  private migrationErrors: MigrationResult['errors'] = [];

  constructor(
    private readonly crispExport: CrispExportService,
    private readonly frontImport: FrontImportService,
    private readonly frontChat: FrontChatService,
    private readonly serviceUserProfiles: ServiceUserProfilesService,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
  ) {}

  getStatus(): { status: MigrationProgress['status'] | 'idle'; progress?: MigrationProgress; errors?: MigrationResult['errors'] } {
    if (!this.currentProgress) return { status: 'idle' };
    return {
      status: this.currentProgress.status,
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
      // Inside the try block so missing env surfaces as a 'failed' status (controller fires
      // runMigration with `void`, so an early throw would otherwise be an unhandled rejection).
      this.validateEnv();

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

  private async migrateAll(since: Date, options: MigrationOptionsDto): Promise<void> {
    logger.log('Fetching conversations from Crisp…');
    let conversations = await this.crispExport.getConversationsSince(since);

    if (options.specificEmail) {
      conversations = conversations.filter(
        (c) => (c.meta?.email ?? c.email)?.toLowerCase() === options.specificEmail!.toLowerCase(),
      );
      logger.log(`Filtered to ${conversations.length} conversations for ${options.specificEmail}`);
    } else if (options.emailDomainFilter) {
      const domain = options.emailDomainFilter.toLowerCase();
      conversations = conversations.filter((c) =>
        (c.meta?.email ?? c.email)?.toLowerCase().endsWith(domain),
      );
      logger.log(`Filtered to ${conversations.length} conversations matching domain "${options.emailDomainFilter}"`);
    }

    this.currentProgress!.totalConversations = conversations.length;

    const byEmail = new Map<string, CrispConversation[]>();
    for (const conv of conversations) {
      const email = (conv.meta?.email ?? conv.email ?? '').toLowerCase() || `unknown-${conv.session_id}`;
      if (!byEmail.has(email)) byEmail.set(email, []);
      byEmail.get(email)!.push(conv);
    }

    this.currentProgress!.totalContacts = byEmail.size;
    logger.log(`Found ${conversations.length} conversations across ${byEmail.size} contacts`);

    await this.runWithConcurrency(
      [...byEmail.entries()].map(([email, convs]) => () => this.migrateUser(email, convs, since, options)),
      3,
    );
  }

  private async migrateUser(
    email: string,
    userConversations: CrispConversation[],
    since: Date,
    options: MigrationOptionsDto,
  ): Promise<void> {
    userConversations.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));

    const firstConv = userConversations[0];
    const name = firstConv?.meta?.nickname ?? firstConv?.nickname;

    const isAnonymous = email.startsWith('unknown-');
    let userId: string | undefined;

    if (!isAnonymous) {
      if (!(options.dryRun ?? false)) {
        // Deleted users have their ID hashed (no '@'); synthesize a stable fake address for Front
        const contactEmail = email.includes('@') ? email : `${email}@deleted.chayn.co`;
        try {
          const user = email.includes('@')
            ? await this.userRepository.findOne({
                // Case-insensitive: signup doesn't normalise the email column.
                where: { email: ILike(email) },
                relations: {
                  partnerAccess: { partner: true, therapySession: true },
                  courseUser: { course: true, sessionUser: { session: true } },
                },
              })
            : null;

          userId = user?.id;

          if (user) {
            await this.serviceUserProfiles.getOrCreateFrontContact(user);
            logger.log(`Populated Front custom fields from DB for ${email}`);
          } else {
            logger.log(`No DB user found for ${email} — creating minimal Front contact`);
            await this.frontImport.getOrCreateFrontContact(contactEmail, name ?? undefined);
          }

          this.currentProgress!.processedContacts++;
        } catch (err) {
          logger.warn(`Failed to set up contact for ${email}: ${(err as Error).message}`);
        }
        await this.delay(INTER_REQUEST_DELAY_MS);
      } else {
        this.currentProgress!.processedContacts++;
      }
    } else {
      logger.log(`Skipping contact creation for anonymous session`);
    }

    let migratedConversationId: string | undefined;
    let importedAnyMessage = false;

    for (const conv of userConversations) {
      if (!conv.session_id) continue;

      try {
        const result = await this.migrateConversationById(conv.session_id, since, options, userId);
        if (result.conversationId && !migratedConversationId) migratedConversationId = result.conversationId;
        if (result.messageCount > 0) importedAnyMessage = true;
      } catch (err) {
        const message = (err as Error).message || 'Unknown error';
        this.recordError({ sessionId: conv.session_id, email: conv.meta?.email ?? conv.email, error: message });
        if (!(options.continueOnError ?? true)) throw err;
        logger.warn(`Skipping session ${conv.session_id} after error: ${message}`);
      }
      await this.delay(INTER_REQUEST_DELAY_MS);
    }

    if (!userId || (options.dryRun ?? false)) return;

    // Sync endpoints process asynchronously and /messages/alt:uid:{uid} can take longer than
    // our polling window to become consistent. If in-flight resolution timed out, fall back
    // to looking up the user's most-recent conversation via their contact — the conversation
    // exists in Front by now, even if it wasn't visible during import.
    if (!migratedConversationId && importedAnyMessage) {
      const contactEmail = email.includes('@') ? email : `${email}@deleted.chayn.co`;
      const fallback = await this.frontChat.findConversationIdByContact(userId, contactEmail);
      if (fallback) {
        migratedConversationId = fallback;
        logger.log(`Recovered conversation ${fallback} for user ${userId} via contact fallback`);
      }
    }

    if (migratedConversationId) {
      try {
        // Migration is authoritative — overwrite any stale frontConversationId that may have
        // been saved by an earlier migration run pointing to a now-empty Front conversation.
        await this.frontChat.setMigratedConversationId(userId, migratedConversationId);
        logger.log(`Saved frontConversationId ${migratedConversationId} for user ${userId}`);
      } catch (err) {
        logger.warn(`Failed to save frontConversationId for user ${userId}: ${(err as Error).message}`);
      }
    }
  }

  private async runWithConcurrency(tasks: (() => Promise<unknown>)[], concurrency: number): Promise<void> {
    const executing = new Set<Promise<unknown>>();
    for (const task of tasks) {
      const p = task().finally(() => executing.delete(p));
      executing.add(p);
      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);
  }

  private async migrateSingleConversation(sessionId: string, options: MigrationOptionsDto): Promise<void> {
    this.currentProgress!.totalConversations = 1;
    await this.migrateConversationById(sessionId, new Date(0), options);
  }

  private async migrateConversationById(
    sessionId: string,
    since: Date,
    options: MigrationOptionsDto,
    userId?: string,
  ): Promise<{ conversationId?: string; messageCount: number }> {
    logger.log(`Processing conversation ${sessionId}`);

    const data = await this.crispExport.getConversationData(sessionId, since);
    await this.delay(INTER_REQUEST_DELAY_MS);

    const cutoffMs = since.getTime();
    data.messages = data.messages.filter((m) => (m.timestamp ?? 0) >= cutoffMs);
    data.notes = data.notes.filter((n) => n.timestamp >= cutoffMs);

    this.currentProgress!.totalMessages += data.messages.length;
    this.currentProgress!.totalNotes += data.notes.length;
    this.currentProgress!.totalAttachments += data.messages.filter((m) => m.type === 'file').length;

    const result = await this.frontImport.importConversation(data, {
      dryRun: options.dryRun ?? false,
      skipAttachments: options.skipAttachments ?? false,
      skipNotes: options.skipNotes ?? false,
      userId,
    });

    this.currentProgress!.processedConversations++;
    this.currentProgress!.processedMessages += options.dryRun ? data.messages.length : result.messageIds.length;
    this.currentProgress!.processedNotes += options.dryRun ? data.notes.length : result.commentIds.length;
    if (!options.skipAttachments) {
      this.currentProgress!.processedAttachments += data.messages.filter((m) => m.type === 'file').length;
    }

    return {
      conversationId: result.conversationId || undefined,
      messageCount: options.dryRun ? data.messages.length : result.messageIds.length,
    };
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
    logger.error(`Migration error${entry.sessionId ? ` [${entry.sessionId}]` : ''}: ${entry.error}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
