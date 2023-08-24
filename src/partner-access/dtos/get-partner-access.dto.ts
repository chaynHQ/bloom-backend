import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class GetPartnerAccessesDto {
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  featureLiveChat: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  featureTherapy: boolean;

  @IsInt()
  @IsOptional()
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsInt()
  @IsOptional()
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  accessCode: string;
}
