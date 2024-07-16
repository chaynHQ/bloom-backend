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
import { createHmac } from 'crypto';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { storyblokWebhookSecret } from 'src/utils/constants';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { WebhookCreateEventLogDto } from 'src/webhooks/dto/webhook-create-event-log.dto';
import { ZapierSimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { ZapierAuthGuard } from '../partner-access/zapier-auth.guard';
import { StoryDto } from './dto/story.dto';
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

  @UseGuards(ZapierAuthGuard)
  @Post('event-log')
  @ApiBody({ type: WebhookCreateEventLogDto })
  async createEventLog(@Body() createEventLogDto): Promise<EventLogEntity> {
    return this.webhooksService.createEventLog(createEventLogDto);
  }

  @Post('storyblok')
  @ApiBody({ type: StoryDto })
  async updateStory(@Request() req, @Body() data: StoryDto, @Headers() headers) {
    const signature: string | undefined = headers['webhook-signature'];
    // Verify storyblok signature uses storyblok webhook secret - see https://www.storyblok.com/docs/guide/in-depth/webhooks#securing-a-webhook
    if (!signature) {
      const error = `Storyblok webhook error - no signature provided`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }
    req.setEncoding('utf8');

    const bodyHmac = createHmac('sha1', storyblokWebhookSecret).update(req.rawBody).digest('hex');
    if (bodyHmac !== signature) {
      const error = `Storyblok webhook error - signature mismatch`;
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.UNAUTHORIZED);
    }
    return this.webhooksService.updateStory(data);
  }
}
