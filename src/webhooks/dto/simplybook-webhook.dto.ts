import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum SimplybookNotificationType {
  CREATE = 'create',
  CANCEL = 'cancel',
  CHANGE = 'change',
  NOTIFY = 'notify',
}

export class SimplybookWebhookDto {
  @IsInt()
  @Type(() => Number)
  @IsDefined()
  @ApiProperty({ type: Number })
  booking_id: number;

  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  company: string;

  @IsEnum(SimplybookNotificationType)
  @IsDefined()
  @ApiProperty({ enum: SimplybookNotificationType })
  notification_type: SimplybookNotificationType;

  // Unix timestamp (seconds) when Simplybook generated the webhook. Used to reject
  // replayed webhooks if a leaked URL token is used to re-submit captured payloads.
  // Optional so we don't break if Simplybook ever omits it; presence is enforced in
  // the service layer with a clear log message instead.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiProperty({ type: Number, required: false })
  webhook_timestamp?: number;
}
