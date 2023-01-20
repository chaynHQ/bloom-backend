import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class PartnerFeatureDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  partnerFeatureId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  featureId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  partnerId: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
