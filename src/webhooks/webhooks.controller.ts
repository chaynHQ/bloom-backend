import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
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
    const updatedPartnerAccessTherapy = await this.webhooksService.updatePartnerAccessTherapy(
      simplybookBodyDto,
    );
    this.logger.log(
      `Updated partner access therapy: ${updatedPartnerAccessTherapy.clientEmail} - ${updatedPartnerAccessTherapy.bookingCode}`,
    );

    return updatedPartnerAccessTherapy;
  }

  @UseGuards(ZapierAuthGuard)
  @Post('therapy-feedback')
  async sendTherapyFeedbackEmail(): Promise<string> {
    return this.webhooksService.sendFirstTherapySessionFeedbackEmail();
  }

  @UseGuards(ZapierAuthGuard)
  @Post('impact-measurement')
  async sendImpactMeasurementEmail(): Promise<string> {
    return this.webhooksService.sendImpactMeasurementEmail();
  }

  @UseGuards(ZapierAuthGuard)
  @Post('event-log')
  @ApiBody({ type: WebhookCreateEventLogDto })
  async createEventLog(@Body() createEventLogDto): Promise<EventLogEntity> {
    return this.webhooksService.createEventLog(createEventLogDto);
  }

  @Post('storyblok')
  @ApiBody({ type: StoryDto })
  async updateStory(@Body() storyDto: StoryDto) {
    return this.webhooksService.updateStory(storyDto);
  }
}
