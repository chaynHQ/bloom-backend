import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class UpdatePartnerAccessDto {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  featureLiveChat: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  featureTherapy: boolean;

  @IsInt()
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;
}
