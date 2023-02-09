import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GetPartnerFeatureDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  partnerFeatureId: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  featureId: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  partnerId: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
