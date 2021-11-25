import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty, IsString } from 'class-validator';

enum ZAPIER_ACTION_ENUM {
  NEW_BOOKING = 'NEW_BOOKING',
  CANCELED_BOOKING = 'CANCELED_BOOKING',
}

export class ZapierBodyDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @IsEnum(ZAPIER_ACTION_ENUM)
  @ApiProperty({ type: String })
  action: ZAPIER_ACTION_ENUM;

  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  partnerAccessCode: string;
}
