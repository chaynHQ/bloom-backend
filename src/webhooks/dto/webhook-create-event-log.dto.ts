import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsDefined, IsNotEmpty } from 'class-validator';
import { EVENT_NAME } from '../../event-logger/event-logger.interface';
import { SecureInput } from '../../utils/sanitization.decorators';

export class WebhookCreateEventLogDto {
  @SecureInput('text', { required: true, maxLength: 200 })
  @IsDefined()
  @ApiProperty({ type: String })
  event: EVENT_NAME;

  @IsNotEmpty()
  @IsDate()
  @IsDefined()
  @ApiProperty({ type: Date })
  date: Date;

  @SecureInput('email', { maxLength: 255 })
  @ApiProperty({ type: String })
  email?: string;

  @SecureInput('id', { maxLength: 36 })
  @ApiProperty({ type: String })
  userId?: string;
}
