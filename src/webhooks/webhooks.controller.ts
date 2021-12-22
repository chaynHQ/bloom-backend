import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { ZapierAuthGuard } from '../partner-access/zapier-auth.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}
  @UseGuards(ZapierAuthGuard)
  @Post('simplybook')
  @ApiBody({ type: SimplybookBodyDto })
  async updatePartnerAccessBooking(@Body() simplybookBodyDto: SimplybookBodyDto): Promise<string> {
    return this.webhooksService.updatePartnerAccessBooking(simplybookBodyDto);
  }
}
