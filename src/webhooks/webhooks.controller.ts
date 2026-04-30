import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import {
  frontChannelSigningSecret,
  frontChatWebhookToken,
  storyblokWebhookSecret,
} from 'src/utils/constants';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { ZapierSimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { ZapierAuthGuard } from '../partner-access/zapier-auth.guard';
import { FrontChatWebhookDto } from './dto/front-chat-webhook.dto';
import { isChannelApiRequest } from './dto/front-channel-webhook.dto';
import { StoryWebhookDto } from './dto/story.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@ControllerDecorator()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}
  private readonly logger = new Logger('WebhookService');

  @UseGuards(ZapierAuthGuard)
  @Post('simplybook')
  @ApiBody({ type: ZapierSimplybookBodyDto })
  async updatePartnerAccessTherapy(
    @Body() simplybookBodyDto: ZapierSimplybookBodyDto,
  ): Promise<TherapySessionEntity> {
    return this.webhooksService.updatePartnerAccessTherapy(simplybookBodyDto);
  }

  @Post('storyblok')
  @ApiBody({ type: StoryWebhookDto })
  async handleStoryUpdated(@Request() req, @Body() data: StoryWebhookDto, @Headers() headers) {
    const signature: string | undefined = headers['webhook-signature'];
    // https://www.storyblok.com/docs/guide/in-depth/webhooks#securing-a-webhook
    if (!signature) {
      const error = `Storyblok webhook error - no signature provided`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }
    req.setEncoding('utf8');

    const bodyHmac = createHmac('sha1', storyblokWebhookSecret).update(req.rawBody).digest('hex');
    const expected = Buffer.from(bodyHmac);
    const provided = Buffer.from(signature);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      const error = `Storyblok webhook error - signature mismatch`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }
    return this.webhooksService.handleStoryUpdated(data);
  }

  // Single endpoint serves both Front integrations:
  //   1. Events API     — inbound/outbound/out_reply notifications, Bearer auth.
  //   2. Channel API    — outbound agent messages from Front UI, X-Front-Signature
  //                       HMAC auth, MUST return { type: 'success', external_id,
  //                       external_conversation_id } or Front shows "channel
  //                       servers are unresponsive" to the agent.
  // Body is typed loosely so the global ValidationPipe doesn't 400 the channel
  // payload (different shape from FrontChatWebhookDto).
  @Post('front-chat')
  @ApiBody({ type: FrontChatWebhookDto })
  async handleFrontChatWebhook(
    @Request() req,
    @Body() data: Record<string, unknown>,
    @Headers() headers,
  ): Promise<unknown> {
    // Diagnostic — every Front POST should produce one of these lines so we
    // can see what shape Front is sending and whether the route fires at all.
    const headerKeys = Object.keys(headers || {})
      .filter((k) => /^x-front|authorization|content-type/i.test(k))
      .reduce<Record<string, string>>((acc, k) => {
        acc[k] = k.toLowerCase() === 'authorization' ? '<redacted>' : String(headers[k]);
        return acc;
      }, {});
    this.logger.log(
      `Front webhook received - bodyKeys=[${Object.keys(data || {}).join(',')}] ` +
        `bodyType=${(data as { type?: unknown })?.type ?? 'absent'} ` +
        `headers=${JSON.stringify(headerKeys)}`,
    );

    if (isChannelApiRequest(data)) {
      this.logger.log(`Front webhook routed -> CHANNEL branch (type=${data.type})`);
      return this.handleFrontChannelRequest(req, data, headers);
    }
    this.logger.log('Front webhook routed -> EVENTS branch');

    if (!frontChatWebhookToken) {
      throw new HttpException(
        'Front Chat webhook token not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const authHeader: string | undefined = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      const error = 'Front Chat webhook error - missing or invalid Authorization header';
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }

    const provided = Buffer.from(authHeader.slice(7));
    const expected = Buffer.from(frontChatWebhookToken);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      const error = 'Front Chat webhook error - invalid token';
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }

    return this.webhooksService.handleFrontChatWebhook(data as unknown as FrontChatWebhookDto);
  }

  private async handleFrontChannelRequest(
    req,
    data: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<unknown> {
    if (!frontChannelSigningSecret) {
      this.logger.error('Front Channel signing secret not configured');
      throw new HttpException(
        'Front Channel signing secret not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Spec: https://dev.frontapp.com/docs/security-1
    //   X-Front-Signature              = base64(HMAC-SHA256(secret, `${ts}:${body}`))
    //   X-Front-Request-Timestamp      = unix seconds; reject if >5 min skew
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

    // Front's X-Front-Request-Timestamp is observed to be unix MILLISECONDS in
    // practice (not seconds, despite what some docs imply). Normalize so the
    // 5-min replay window is checked against ms-since-epoch.
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

    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) {
      this.logger.error('Front Channel webhook - rawBody unavailable');
      throw new HttpException('Raw body unavailable', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const expectedDigest = createHmac('sha256', frontChannelSigningSecret)
      .update(`${timestamp}:${rawBody.toString('utf8')}`)
      .digest('base64');
    const expectedBuf = Buffer.from(expectedDigest);
    const providedBuf = Buffer.from(signature);
    if (
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      this.logger.error(
        `Front Channel webhook - signature mismatch. received="${signature}" ` +
          `expected="${expectedDigest}" rawBodyBytes=${rawBody.length} ts=${timestamp}`,
      );
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // Dispatch by Channel API request type.
    // Spec: https://dev.frontapp.com/docs/getting-started-with-partner-channels
    const type = (data as { type?: string }).type;
    if (type === 'authorization') {
      // Channel registration handshake — Front needs us to echo back the URL it
      // should use for future channel calls. Use the URL Front actually called
      // (works behind ngrok where the host is dynamic).
      const proto = (headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = headers['x-forwarded-host'] || headers['host'];
      const webhookUrl = `${proto}://${host}${req.originalUrl ?? req.url}`;
      this.logger.log(`Front Channel authorization OK — echoing webhook_url=${webhookUrl}`);
      return { type: 'success', webhook_url: webhookUrl };
    }

    if (type === 'message') {
      return this.webhooksService.handleFrontChannelOutbound(data);
    }

    // Other channel events (delete, message_imported, etc.) — acknowledge
    // generically so Front doesn't retry. Add specific handlers as needed.
    this.logger.log(`Front Channel request type="${type}" acknowledged without handler`);
    return { type: 'success' };
  }
}
