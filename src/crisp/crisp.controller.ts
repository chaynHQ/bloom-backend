import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { CrispService } from './crisp.service';

@ApiTags('Crisp')
@Controller('crisp')
export class CrispController {
  constructor(private readonly crispService: CrispService) {}

  @Get('/analytics-message-origin')
  @UseGuards(SuperAdminAuthGuard)
  async getCrispMessageOriginAnalytics() {
    return this.crispService.getCrispMessageOriginAnalytics();
  }
}
