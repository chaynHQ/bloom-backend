import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { EVENT_NAME, EventLogMetadata } from '../event-logger.interface';
import { IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class CreateEventLogDto {
  @IsNotEmpty()
  @IsEnum(EVENT_NAME)
  @ApiProperty({ enum: EVENT_NAME, description: 'The type of event being logged' })
  event: EVENT_NAME;

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'object' && value !== null) {
      // Sanitize string values in the metadata object
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'string') {
          // Basic sanitization for metadata strings
          sanitized[key] = val.replace(/<script[^>]*>.*?<\/script>/gi, '')
                             .replace(/javascript:/gi, '')
                             .trim();
        } else {
          sanitized[key] = val;
        }
      }
      return sanitized;
    }
    return value;
  })
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ description: 'The type of event being logged' })
  metadata: EventLogMetadata;
}
