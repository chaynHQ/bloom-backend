import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePartnerFeatureDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  partnerFeatureId: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  partnerId: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  featureId: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
