import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { CrispMigrationService } from './crisp-migration.service';
import { MigrationOptionsDto, MigrationStatusResponseDto } from './dto/migration-options.dto';

@ApiTags('Crisp Migration')
@Controller('/v1/crisp-migration')
export class CrispMigrationController {
  constructor(private readonly migrationService: CrispMigrationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current migration status' })
  @ApiResponse({ status: 200, description: 'Migration status', type: MigrationStatusResponseDto })
  @UseGuards(SuperAdminAuthGuard)
  getStatus() {
    return this.migrationService.getStatus();
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run the Crisp → Front migration',
    description:
      'Fetches all Crisp conversations from the last 6 months (or since startDate) and ' +
      'imports them into Front. Idempotent — external_id deduplication prevents ' +
      'duplicates if run more than once. Use dryRun=true to validate without writing data.',
  })
  @ApiResponse({ status: 200, description: 'Migration started — poll GET /status for progress' })
  @ApiResponse({ status: 400, description: 'Migration already running' })
  @UseGuards(SuperAdminAuthGuard)
  async runMigration(@Body() options: MigrationOptionsDto = {}): Promise<{ status: 'started' }> {
    if (this.migrationService.isRunning()) {
      throw new BadRequestException('A migration is already in progress. Poll GET /status.');
    }

    void this.migrationService.runMigration(options);
    return { status: 'started' };
  }
}
