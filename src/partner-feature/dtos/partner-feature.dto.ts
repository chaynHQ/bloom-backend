import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID, IsDefined } from 'class-validator';

export class PartnerFeatureDto {
  @IsUUID(4, { message: 'partnerFeatureId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  partnerFeatureId: string;

  @IsUUID(4, { message: 'featureId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  featureId: string;

  @IsUUID(4, { message: 'partnerId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  partnerId: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
