import { Controller, HttpException, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { ReportingService } from './reporting.service';
import { ReportPayload, ReportPeriod } from './reporting.types';

const VALID_PERIODS: ReadonlyArray<ReportPeriod> = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @UseGuards(SuperAdminAuthGuard)
  @Post('run')
  @ApiOperation({
    summary:
      'Manually trigger a reporting run. Bypasses the idempotency slot so repeated triggers in the same window still post to Slack.',
  })
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] })
  async run(@Query('period') period: ReportPeriod): Promise<ReportPayload> {
    if (!VALID_PERIODS.includes(period)) {
      throw new HttpException(
        `period must be one of: ${VALID_PERIODS.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.reportingService.run(period, {
      bypassIdempotency: true,
      trigger: 'manual',
    });
  }
}
