import { Body, Controller, Headers, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { FrontChatWebhookService } from 'src/front-chat/front-chat-webhook.service';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { SimplybookBodyDto } from '../partner-access/dtos/simplybook-body.dto';
import { ZapierAuthGuard } from '../partner-access/zapier-auth.guard';
import { FrontChatWebhookDto } from './dto/front-chat-webhook.dto';
import { StoryWebhookDto } from './dto/story.dto';
import { SimplybookWebhookDto } from './dtos/simplybook-webhook.dto';
import { SimplybookWebhookGuard } from './guards/simplybook-webhook.guard';
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
  @ApiBody({ type: SimplybookBodyDto })
  async updatePartnerAccessTherapy(
    @Body() simplybookBodyDto: SimplybookBodyDto,
  ): Promise<TherapySessionEntity> {
    return this.webhooksService.updatePartnerAccessTherapy(simplybookBodyDto);
  }

  @UseGuards(SimplybookWebhookGuard)
  @Post('simplybook-admin')
  @ApiBody({ type: SimplybookWebhookDto })
  @ApiQuery({ name: 'token', required: true, description: 'Webhook secret token' })
  async handleSimplybookWebhook(
    @Body() webhookDto: SimplybookWebhookDto,
    @Query('token') _token: string,
  ): Promise<TherapySessionEntity | void> {
    return this.webhooksService.handleSimplybookWebhook(webhookDto);
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
