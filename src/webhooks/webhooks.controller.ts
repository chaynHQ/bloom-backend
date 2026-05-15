import { Body, Controller, Get, Headers, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { FrontChatWebhookService } from 'src/front-chat/front-chat-webhook.service';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { ZapierSimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { ZapierAuthGuard } from '../partner-access/zapier-auth.guard';
import { FrontChatWebhookDto } from './dto/front-chat-webhook.dto';
import { MailchimpWebhookDto } from './dto/mailchimp-webhook.dto';
import { StoryWebhookDto } from './dto/story.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@ControllerDecorator()
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly frontChatWebhookService: FrontChatWebhookService,
  ) {}

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
  async handleStoryUpdated(
    @Request() req,
    @Body() data: StoryWebhookDto,
    @Headers('webhook-signature') signature: string | undefined,
  ): Promise<unknown> {
    return this.webhooksService.handleStoryblokWebhook(req.rawBody, signature, data);
  }

  // Mailchimp sends a GET to verify the endpoint on initial setup, and POSTs for events.
  // Authentication is via a shared secret in the query string configured in Mailchimp's dashboard.
  @Get('mailchimp')
  verifyMailchimpWebhook(@Query('secret') secret: string): void {
    if (!secret) return;
  }

  @Post('mailchimp')
  @ApiBody({ type: MailchimpWebhookDto })
  async handleMailchimpWebhook(
    @Query('secret') secret: string,
    @Body() dto: MailchimpWebhookDto,
  ): Promise<void> {
    return this.webhooksService.handleMailchimpWebhook(dto, secret);
  }

  // Single endpoint serves both Front integrations:
  //   1. Events API     — inbound/outbound/out_reply notifications, Bearer auth.
  //   2. Channel API    — outbound agent messages from Front UI, X-Front-Signature HMAC auth.
  // Body is typed loosely so the global ValidationPipe doesn't 400 the Channel API
  // payload (different shape from FrontChatWebhookDto).
  @Post('front-chat')
  @ApiBody({ type: FrontChatWebhookDto })
  async handleFrontChatWebhook(
    @Request() req,
    @Body() data: Record<string, unknown>,
    @Headers() headers,
  ): Promise<unknown> {
    return this.frontChatWebhookService.handleFrontWebhook({
      rawBody: req.rawBody,
      data,
      headers,
      protocol: (headers['x-forwarded-proto'] as string) || req.protocol || 'https',
      host: headers['x-forwarded-host'] || headers['host'],
      originalUrl: req.originalUrl ?? req.url,
    });
  }
}
