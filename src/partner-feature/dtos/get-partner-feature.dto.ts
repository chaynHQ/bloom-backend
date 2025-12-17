import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class GetPartnerFeatureDto {
  @IsOptional()
  @IsUUID(4, { message: 'partnerFeatureId must be a valid UUID' })
  @ApiProperty({ type: String })
  partnerFeatureId: string;

  @IsOptional()
  @IsUUID(4, { message: 'featureId must be a valid UUID' })
  @ApiProperty({ type: String })
  featureId: string;

  @IsOptional()
  @IsUUID(4, { message: 'partnerId must be a valid UUID' })
  @ApiProperty({ type: String })
  partnerId: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
