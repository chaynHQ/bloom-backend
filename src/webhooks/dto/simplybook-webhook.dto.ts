import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsEnum, IsInt, IsString } from 'class-validator';

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
}
