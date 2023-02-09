import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePartnerFeatureDto {
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
