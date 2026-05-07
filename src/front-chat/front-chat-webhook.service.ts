import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { Logger } from 'src/logger/logger';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { frontChannelSigningSecret, frontChatWebhookToken } from 'src/utils/constants';
import { formatAuthorName } from 'src/utils/html';
import {
  FrontChannelAttachment,
  FrontChannelOutboundPayload,
  isChannelApiRequest,
} from 'src/webhooks/dto/front-channel-webhook.dto';
import {
  FrontChatWebhookDto,
  FrontWebhookMessageAuthor,
} from 'src/webhooks/dto/front-chat-webhook.dto';
import { FrontChatGateway } from './front-chat.gateway';
import { FRONT_WEBHOOK_EVENT_TYPE } from './front-chat.interface';
import { buildThreadRef, FrontChatService } from './front-chat.service';

@Injectable()
export class FrontChatWebhookService {
  private readonly logger = new Logger('FrontChatWebhookService');

  constructor(
    private readonly frontChatService: FrontChatService,
    private readonly frontChatGateway: FrontChatGateway,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
    private readonly eventLoggerService: EventLoggerService,
  ) {}

  // Single entry point for the /webhooks/front-chat endpoint. Routes between the
  // Events API (bearer auth) and Channel API (HMAC auth + typed dispatch).
  async handleFrontWebhook(
    rawBody: Buffer | undefined,
    data: Record<string, unknown>,
    headers: Record<string, string>,
    protocol: string,
    host: string | undefined,
    originalUrl: string,
  ): Promise<unknown> {
    if (isChannelApiRequest(data)) {
      return this.handleFrontChannelRequest(rawBody, data, headers, protocol, host, originalUrl);
    }

    if (!frontChatWebhookToken) {
      throw new HttpException(
        'Front Chat webhook token not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const authHeader: string | undefined = headers['authorization'];
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

    const webhookData = data as unknown as FrontChatWebhookDto;
    const email = webhookData?.conversation?.recipient?.handle;
    if (!email) {
      // Front sends events (e.g. "tag") with no conversation recipient — acknowledge
      // with 200 so Front does not retry.
      return;
    }

    // Capture conversation ID from inbound events so history loads immediately on reconnect.
    if (webhookData.type === FRONT_WEBHOOK_EVENT_TYPE.INBOUND && webhookData.conversation?.id) {
      this.frontChatService
        .updateChatUserByEmail(email, { frontConversationId: webhookData.conversation.id })
        .catch(() => {});
    }

    const eventMap: Partial<Record<string, EVENT_NAME>> = {
      [FRONT_WEBHOOK_EVENT_TYPE.INBOUND]: EVENT_NAME.CHAT_MESSAGE_SENT,
      [FRONT_WEBHOOK_EVENT_TYPE.OUTBOUND]: EVENT_NAME.CHAT_MESSAGE_RECEIVED,
      [FRONT_WEBHOOK_EVENT_TYPE.OUT_REPLY]: EVENT_NAME.CHAT_MESSAGE_RECEIVED,
    };
    const eventName = eventMap[webhookData.type];
    if (!eventName) return;

    try {
      await this.eventLoggerService.createEventLog(
        { event: eventName, date: new Date(webhookData.emitted_at * 1000) },
        email,
      );
    } catch (error) {
      this.logger.warn(
        `Front webhook: failed to log ${eventName} for ${email}: ${error?.message || 'unknown error'}`,
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
      ? await this.frontChatService.getChatUserByEmail(recipientEmail)
      : null;
    const externalConversationId =
      (data as FrontChannelOutboundPayload).metadata?.external_conversation_ids?.[0] ??
      (data as FrontChannelOutboundPayload).metadata?.external_conversation_id ??
      (chatUser ? buildThreadRef(chatUser.userId) : externalId);

    const attachments = (payload.attachments ?? []) as FrontChannelAttachment[];
    const imageAttachment = attachments.find((a) => a.content_type?.startsWith('image/') && a.url);
    const audioAttachment = !imageAttachment
      ? attachments.find((a) => a.content_type?.startsWith('audio/') && a.url)
      : undefined;
    const attachment = imageAttachment ?? audioAttachment;

    if (recipientEmail && (messageBody || attachment)) {
      this.frontChatGateway.emitAgentReply(recipientEmail, {
        id: externalId,
        body: messageBody || (attachment?.filename ?? 'Attachment'),
        authorEmail: payload.author?.email,
        authorName: formatAuthorName(payload.author as FrontWebhookMessageAuthor | undefined),
        emittedAt: Math.floor(Date.now() / 1000),
        ...(attachment?.url && {
          attachmentUrl: `/front-chat/attachment-proxy?url=${encodeURIComponent(attachment.url)}`,
          kind: imageAttachment ? 'image' : 'voice',
        }),
      });
      this.logger.log(`Front Channel: forwarded agent reply to ${recipientEmail}`);

      this.frontChatService
        .updateChatUserByEmail(recipientEmail, { lastMessageReceivedAt: new Date() })
        .then((chatUser) => {
          if (chatUser) {
            return this.serviceUserProfilesService.updateServiceUserProfilesChatActivity(
              chatUser,
              recipientEmail,
            );
          }
        })
        .catch(() => {});
    } else {
      this.logger.warn(
        `Front Channel: missing recipient or body (recipient=${recipientEmail}, hasBody=${!!messageBody})`,
      );
    }

    return {
      type: 'success',
      external_id: externalId,
      external_conversation_id: externalConversationId,
    };
  }

  // Spec: https://dev.frontapp.com/docs/security-1
  //   X-Front-Signature = base64(HMAC-SHA256(secret, `${ts}:${body}`))
  //   X-Front-Request-Timestamp = unix ms (docs say seconds but observed as ms in practice)
  private async handleFrontChannelRequest(
    rawBody: Buffer | undefined,
    data: FrontChannelOutboundPayload,
    headers: Record<string, string>,
    protocol: string,
    host: string | undefined,
    originalUrl: string,
  ): Promise<unknown> {
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
    if (Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
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

    const type = (data as { type?: string }).type;

    if (type === 'authorization') {
      // Channel registration handshake — echo back the URL Front should use for future calls.
      const webhookUrl = `${protocol}://${host}${originalUrl}`;
      this.logger.log(`Front Channel authorization OK — echoing webhook_url=${webhookUrl}`);
      return { type: 'success', webhook_url: webhookUrl };
    }

    if (type === 'message') {
      return this.handleFrontChannelOutbound(data);
    }

    // Other channel events (delete, message_imported, etc.) — acknowledge generically.
    this.logger.log(`Front Channel request type="${type}" acknowledged without handler`);
    return { type: 'success' };
  }

}
