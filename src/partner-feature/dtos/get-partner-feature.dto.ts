import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class GetPartnerFeatureDto {
  @IsUUID(4, { message: 'partnerFeatureId must be a valid UUID' })
  @IsOptional()
  @ApiProperty({ type: String })
  partnerFeatureId: string;

  @IsUUID(4, { message: 'featureId must be a valid UUID' })
  @IsOptional()
  @ApiProperty({ type: String })
  featureId: string;

  @IsUUID(4, { message: 'partnerId must be a valid UUID' })
  @IsOptional()
  @ApiProperty({ type: String })
  partnerId: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
