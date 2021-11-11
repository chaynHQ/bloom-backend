import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean, IsInt } from 'class-validator';

export class CreateAccessCodeDto {
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  featureLiveChat: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  featureTherapy: boolean;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;
}
