import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsObject, IsOptional } from 'class-validator';
import { EVENT_NAME, EventLogMetadata } from '../event-logger.interface';

export class CreateEventLogDto {
  @IsDefined()
  @IsEnum(EVENT_NAME)
  @ApiProperty({ enum: EVENT_NAME, description: 'The type of event being logged' })
  event: EVENT_NAME;

  @IsOptional()
  @IsObject()
  @ApiProperty({ description: 'The type of event being logged' })
  metadata: EventLogMetadata;
}
