import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { TicketIdsDto } from './dtos/ticket-ids.dto';
import { TrengoService } from './trengo.service';

@ApiTags('Trengo')
@Controller('trengo')
export class TrengoController {
  constructor(private readonly trengoService: TrengoService) {}

  // Returns the mapping of custom field titles to Trengo numeric IDs.
  // The frontend needs these to pass contact_data.custom_fields to the Trengo widget.
  @Get('/custom-field-ids')
  getCustomFieldIds() {
    return this.trengoService.getCustomFieldIds();
  }

  @Get('/tickets')
  @UseGuards(SuperAdminAuthGuard)
  async getAllTicketIds() {
    return this.trengoService.getAllTicketIds();
  }

  @Post('/analytics-message-origin')
  @UseGuards(SuperAdminAuthGuard)
  async getMessageChannelAnalytics(@Body() { ticketIds }: TicketIdsDto) {
    return this.trengoService.getMessageChannelAnalytics(ticketIds);
  }
}
