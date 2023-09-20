import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ControllerDecorator } from 'src/utils/controller.decorator';
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
  ): Promise<string> {
    const updatedPartnerAccessTherapy = await this.webhooksService.updatePartnerAccessTherapy(
      simplybookBodyDto,
    );
    this.logger.log(
      `Updated partner access therapy: ${updatedPartnerAccessTherapy.clientEmail} - ${updatedPartnerAccessTherapy.bookingCode}`,
    );

    return 'Successful';
  }

  @UseGuards(ZapierAuthGuard)
  @Post('therapy-feedback')
  async sendTherapyFeedbackEmail(): Promise<string> {
    return this.webhooksService.sendFirstTherapySessionFeedbackEmail();
  }

  @Post('storyblok')
  @ApiBody({ type: StoryDto })
  async updateStory(@Body() storyDto: StoryDto) {
    return this.webhooksService.updateStory(storyDto);
  }
}
