import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ChatUserService } from 'src/chat-user/chat-user.service';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { Logger } from 'src/logger/logger';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { frontChannelSigningSecret, frontChatWebhookToken } from 'src/utils/constants';
import { formatAuthorName } from 'src/utils/html';
import {
  FrontChannelOutboundPayload,
  isChannelApiRequest,
} from 'src/webhooks/dto/front-channel-webhook.dto';
import {
  FrontChatWebhookDto,
  FrontWebhookMessageAuthor,
} from 'src/webhooks/dto/front-chat-webhook.dto';
import { FrontChatGateway } from './front-chat.gateway';
import { classifyAttachments, toAgentReplyAttachment } from './front-chat.helpers';
import {
  FRONT_WEBHOOK_EVENT_TO_EVENT_NAME,
  FRONT_WEBHOOK_EVENT_TYPE,
} from './front-chat.interface';
import { buildThreadRef, FrontChatService } from './front-chat.service';

const CHANNEL_API_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export interface FrontWebhookRequest {
  rawBody: Buffer | undefined;
  data: Record<string, unknown>;
  headers: Record<string, string>;
  protocol: string;
  host: string | undefined;
  originalUrl: string;
}

@Injectable()
export class FrontChatWebhookService {
  private readonly logger = new Logger('FrontChatWebhookService');

  constructor(
    private readonly frontChatService: FrontChatService,
    private readonly chatUserService: ChatUserService,
    private readonly frontChatGateway: FrontChatGateway,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
    private readonly eventLoggerService: EventLoggerService,
  ) {}

  // Single entry point for the /webhooks/front-chat endpoint. Routes between the
  // Events API (bearer auth) and Channel API (HMAC auth + typed dispatch).
  async handleFrontWebhook(req: FrontWebhookRequest): Promise<unknown> {
    if (isChannelApiRequest(req.data)) {
      return this.handleFrontChannelRequest(req);
    }

    this.verifyFrontEventsBearer(req.headers);
    return this.handleFrontEvent(req.data as unknown as FrontChatWebhookDto);
  }

  private async syncChatUserFromInbound(email: string, conversationId: string): Promise<void> {
    const existing = await this.chatUserService.getChatUserByEmail(email);

    // Backfill custom fields on the first inbound — covers Channel-API auto-created
    // contacts. The sync writes frontContactId via addToFrontContactList, so subsequent
    // inbounds skip this branch.
    if (!existing?.frontContactId) {
      await this.serviceUserProfilesService.syncFrontContactCustomFields(email);
    }

    if (existing?.frontConversationId) return;
    const updated = await this.chatUserService.updateChatUserByEmail(email, {
      frontConversationId: conversationId,
    });
    if (updated) await this.frontChatService.syncConversationLanguage(updated.userId);
  }

  private async handleFrontEvent(webhookData: FrontChatWebhookDto): Promise<void> {
    const email = webhookData?.conversation?.recipient?.handle;
    if (!email) {
      // Front sends events (e.g. "tag") with no conversation recipient — acknowledge
      // with 200 so Front does not retry.
      return;
    }

    // Capture conversation ID and backfill custom fields on first inbound — gated on local
    // chatUser state so we don't re-do work on every message.
    if (webhookData.type === FRONT_WEBHOOK_EVENT_TYPE.INBOUND && webhookData.conversation?.id) {
      this.syncChatUserFromInbound(email, webhookData.conversation.id).catch(() => {});
    }

    const eventName = FRONT_WEBHOOK_EVENT_TO_EVENT_NAME[webhookData.type];
    if (!eventName) return;

    try {
      await this.eventLoggerService.createEventLog(
        { event: eventName, date: new Date(webhookData.emitted_at * 1000) },
        email,
      );
    } catch (error) {
      this.logger.warn(
        `Front webhook: failed to log ${eventName} (conversation ${webhookData.conversation?.id ?? 'unknown'}): ${error?.message || 'unknown error'}`,
      );
    }
  }

  // Handles outbound messages Front sends to a Custom Channel when an agent replies
  // in the Front UI. Front REQUIRES a 200 with { type: 'success', external_id,
  // external_conversation_id } — any other response shows "channel servers are
  // unresponsive" to the agent.
  async handleFrontChannelOutbound(
    data: FrontChannelOutboundPayload | Record<string, unknown>,
  ): Promise<{ type: 'success'; external_id: string; external_conversation_id: string }> {
    const payload = (data as FrontChannelOutboundPayload).payload ?? {};
    // Front Channel API sends `recipients`; fall back to `to` for legacy variants.
    const recipients = payload.recipients ?? payload.to ?? [];
    const recipientEmail =
      recipients.find((r) => r?.role === 'to' && r?.handle)?.handle ??
      recipients.find((r) => r?.handle)?.handle;
    const messageBody = payload.text ?? payload.body ?? '';
    const externalId = payload.id || `front-${Date.now()}`;
    const chatUser = recipientEmail
      ? await this.chatUserService.getChatUserByEmail(recipientEmail)
      : null;
    const externalConversationId =
      (data as FrontChannelOutboundPayload).metadata?.external_conversation_ids?.[0] ??
      (data as FrontChannelOutboundPayload).metadata?.external_conversation_id ??
      (chatUser ? buildThreadRef(chatUser.userId) : externalId);

    const attachments = classifyAttachments(payload.attachments);
    const firstAttachment = attachments[0];

    if (recipientEmail && (messageBody || attachments.length > 0)) {
      this.frontChatGateway.emitAgentReply(recipientEmail, {
        id: externalId,
        body: messageBody || (firstAttachment?.filename ?? 'Attachment'),
        authorEmail: payload.author?.email,
        authorName: formatAuthorName(payload.author as FrontWebhookMessageAuthor | undefined),
        emittedAt: Math.floor(Date.now() / 1000),
        ...(attachments.length > 0 && {
          attachments: attachments.map(toAgentReplyAttachment),
        }),
      });
      this.logger.log(
        `Front Channel: forwarded agent reply${chatUser ? ` to user ${chatUser.userId}` : ''}`,
      );

      this.chatUserService
        .updateChatUserByEmail(recipientEmail, { lastMessageReceivedAt: new Date() })
        .then((updated) => {
          if (updated) {
            return this.serviceUserProfilesService.updateServiceUserProfilesChatActivity(
              updated,
              recipientEmail,
            );
          }
        })
        .catch((err) => {
          this.logger.error(
            `Front Channel: failed to set lastMessageReceivedAt${chatUser ? ` for user ${chatUser.userId}` : ''}: ${(err as Error)?.message || 'unknown error'}`,
          );
        });
    } else {
      this.logger.warn(
        `Front Channel: missing recipient or body (hasRecipient=${!!recipientEmail}, hasBody=${!!messageBody})`,
      );
    }

    return {
      type: 'success',
      external_id: externalId,
      external_conversation_id: externalConversationId,
    };
  }

  private async handleFrontChannelRequest(req: FrontWebhookRequest): Promise<unknown> {
    this.verifyFrontChannelSignature(req.rawBody, req.headers);

    const type = (req.data as { type?: string }).type;

    if (type === 'authorization') {
      // Channel registration handshake — echo back the URL Front should use for future calls.
      const webhookUrl = `${req.protocol}://${req.host}${req.originalUrl}`;
      this.logger.log(`Front Channel authorization OK — echoing webhook_url=${webhookUrl}`);
      return { type: 'success', webhook_url: webhookUrl };
    }

    if (type === 'message') {
      return this.handleFrontChannelOutbound(req.data as unknown as FrontChannelOutboundPayload);
    }

    // Other channel events (delete, message_imported, etc.) — acknowledge generically.
    this.logger.log(`Front Channel request type="${type}" acknowledged without handler`);
    return { type: 'success' };
  }

  private verifyFrontEventsBearer(headers: Record<string, string>): void {
    if (!frontChatWebhookToken) {
      throw new HttpException(
        'Front Chat webhook token not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.error('Front Chat webhook - missing or invalid Authorization header');
      throw new HttpException(
        'Front Chat webhook error - missing or invalid Authorization header',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const provided = Buffer.from(authHeader.slice(7));
    const expected = Buffer.from(frontChatWebhookToken);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      this.logger.error('Front Chat webhook - invalid token');
      throw new HttpException('Front Chat webhook error - invalid token', HttpStatus.UNAUTHORIZED);
    }
  }

  // Spec: https://dev.frontapp.com/docs/security-1
  //   X-Front-Signature = base64(HMAC-SHA256(secret, `${ts}:${body}`))
  //   X-Front-Request-Timestamp = unix ms (docs say seconds but observed as ms in practice)
  private verifyFrontChannelSignature(
    rawBody: Buffer | undefined,
    headers: Record<string, string>,
  ): void {
    if (!frontChannelSigningSecret) {
      this.logger.error('Front Channel signing secret not configured');
      throw new HttpException(
        'Front Channel signing secret not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const signature = headers['x-front-signature'];
    const timestamp = headers['x-front-request-timestamp'];

    if (!signature || typeof signature !== 'string') {
      this.logger.error('Front Channel webhook - missing X-Front-Signature header');
      throw new HttpException('Missing X-Front-Signature', HttpStatus.UNAUTHORIZED);
    }
    if (!timestamp || typeof timestamp !== 'string') {
      this.logger.error('Front Channel webhook - missing X-Front-Request-Timestamp header');
      throw new HttpException('Missing X-Front-Request-Timestamp', HttpStatus.UNAUTHORIZED);
    }

    const tsRaw = Number(timestamp);
    if (!Number.isFinite(tsRaw)) {
      this.logger.error(`Front Channel webhook - non-numeric timestamp (${timestamp})`);
      throw new HttpException('Bad timestamp', HttpStatus.UNAUTHORIZED);
    }
    const tsMs = tsRaw > 1e12 ? tsRaw : tsRaw * 1000;
    if (Math.abs(Date.now() - tsMs) > CHANNEL_API_TIMESTAMP_TOLERANCE_MS) {
      this.logger.error(
        `Front Channel webhook - timestamp out of range (header=${timestamp}, now=${Date.now()})`,
      );
      throw new HttpException('Stale request', HttpStatus.UNAUTHORIZED);
    }

    if (!rawBody) {
      this.logger.error('Front Channel webhook - rawBody unavailable');
      throw new HttpException('Raw body unavailable', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const expectedDigest = createHmac('sha256', frontChannelSigningSecret)
      .update(`${timestamp}:${rawBody.toString('utf8')}`)
      .digest('base64');
    const expectedBuf = Buffer.from(expectedDigest);
    const providedBuf = Buffer.from(signature);
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      this.logger.error(
        `Front Channel webhook - signature mismatch. received="${signature}" ` +
          `expected="${expectedDigest}" rawBodyBytes=${rawBody.length} ts=${timestamp}`,
      );
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }
  }
}
