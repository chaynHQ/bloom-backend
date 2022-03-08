import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { ZapierAuthGuard } from '../partner-access/zapier-auth.guard';
import { StoryDto } from './dto/story.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@ControllerDecorator()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @UseGuards(ZapierAuthGuard)
  @Post('simplybook')
  @ApiBody({ type: SimplybookBodyDto })
  async updatePartnerAccessTherapy(@Body() simplybookBodyDto: SimplybookBodyDto): Promise<string> {
    return this.webhooksService.updatePartnerAccessTherapy(simplybookBodyDto);
  }

  @Post('storyblok')
  @ApiBody({ type: StoryDto })
  async updateStory(@Body() storyDto: StoryDto) {
    return this.webhooksService.updateStory(storyDto);
  }
}
