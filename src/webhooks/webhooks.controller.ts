import { Body, Controller, Headers, Logger, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
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
    return this.webhooksService.updateStory(req, data, signature);
  }
}
