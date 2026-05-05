import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsEnum, IsInt, IsString, Matches } from 'class-validator';

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
  @Matches(/^[a-f0-9]+$/, { message: 'booking_hash must be a hex string' })
  @IsDefined()
  @ApiProperty({ type: String })
  booking_hash: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  company: string;

  @IsEnum(SimplybookNotificationType)
  @IsDefined()
  @ApiProperty({ enum: SimplybookNotificationType })
  notification_type: SimplybookNotificationType;
}
