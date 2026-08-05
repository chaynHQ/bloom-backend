import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class FrontContactBackfillDto {
  // Omit to cover the whole Front contact list: everyone imported by the Crisp migration plus
  // everyone who has signed up since.
  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'ISO date. Defaults to the start of the Front contact list' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'ISO date. Defaults to no upper bound' })
  endDate?: string;

  // For a trial run against a handful of contacts before committing to the full backfill.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Cap the number of contacts processed' })
  limit?: number;
}
