import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MigrationOptionsDto, MigrationStatusResponseDto } from './dto/migration-options.dto';
import { CrispMigrationService } from './crisp-migration.service';

@ApiTags('Crisp Migration')
@Controller('/v1/crisp-migration')
export class CrispMigrationController {
  constructor(private readonly migrationService: CrispMigrationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current migration status' })
  @ApiResponse({ status: 200, description: 'Migration status', type: MigrationStatusResponseDto })
  getStatus() {
    return this.migrationService.getStatus() ?? { status: 'idle' };
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
  async runMigration(@Body() options: MigrationOptionsDto = {}): Promise<{ status: 'started' }> {
    if (this.migrationService.isRunning()) {
      throw new BadRequestException('A migration is already in progress. Poll GET /status.');
    }

    void this.migrationService.runMigration(options);
    return { status: 'started' };
  }
}
