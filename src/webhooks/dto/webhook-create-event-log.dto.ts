import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EVENT_NAME } from '../../event-logger/event-logger.interface';

export class WebhookCreateEventLogDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  event: EVENT_NAME;

  @IsNotEmpty()
  @IsDate()
  @IsDefined()
  @ApiProperty({ type: Date })
  date: Date;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  userId?: string;
}
