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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { MigrationOptionsDto, MigrationStatusResponseDto } from './dto/migration-options.dto';
import { CrispMigrationService } from './crisp-migration.service';
import { MigrationResult } from './crisp-migration.interface';

@ApiTags('Crisp Migration')
@ApiBearerAuth('access-token')
@UseGuards(SuperAdminAuthGuard)
@Controller('/v1/crisp-migration')
export class CrispMigrationController {
  constructor(private readonly migrationService: CrispMigrationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current migration status' })
  @ApiResponse({ status: 200, description: 'Migration status', type: MigrationStatusResponseDto })
  getStatus(): MigrationResult | { status: 'idle' } {
    return this.migrationService.getStatus() ?? { status: 'idle' };
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run the Crisp → Front migration',
    description:
      'Fetches all Crisp conversations from the last year (or since startDate) and ' +
      'imports them into Front. Idempotent — external_id deduplication prevents ' +
      'duplicates if run more than once. Use dryRun=true to validate without writing data.',
  })
  @ApiResponse({ status: 200, description: 'Migration completed' })
  @ApiResponse({ status: 400, description: 'Migration already running' })
  async runMigration(@Body() options: MigrationOptionsDto = {}): Promise<MigrationResult> {
    if (this.migrationService.isRunning()) {
      throw new BadRequestException('A migration is already in progress. Poll GET /status.');
    }

    return this.migrationService.runMigration(options);
  }
}
