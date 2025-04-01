import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { EVENT_NAME, EventLogMetadata } from '../event-logger.interface';

export class CreateEventLogDto {
  @IsNotEmpty()
  @IsEnum(EVENT_NAME)
  @ApiProperty({ enum: EVENT_NAME, description: 'The type of event being logged' })
  event: EVENT_NAME;

  @IsOptional()
  @IsObject()
  @ApiProperty({ description: 'The type of event being logged' })
  metadata: EventLogMetadata;
}
