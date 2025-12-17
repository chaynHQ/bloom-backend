import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsUUID } from 'class-validator';

export class CreatePartnerFeatureDto {
  @IsUUID(4, { message: 'partnerId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  partnerId: string;

  @IsUUID(4, { message: 'featureId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  featureId: string;

  @IsBoolean()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
