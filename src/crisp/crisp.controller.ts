import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { SessionIdsDto } from './dtos/session-ids.dto';
import { CrispService } from './crisp.service';

@ApiTags('Crisp')
@Controller('crisp')
export class CrispController {
  constructor(private readonly crispService: CrispService) {}

  @Get('/conversations')
  @UseGuards(SuperAdminAuthGuard)
  async getAllConversationSessionIds() {
    return this.crispService.getAllConversationSessionIds();
  }

  @Post('/analytics-message-origin')
  @UseGuards(SuperAdminAuthGuard)
  async getCrispMessageOriginAnalytics(@Body() { sessionIds }: SessionIdsDto) {
    return this.crispService.getCrispMessageOriginAnalytics(sessionIds);
  }
}
