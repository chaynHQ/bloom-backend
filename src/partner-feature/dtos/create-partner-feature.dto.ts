import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class CreatePartnerFeatureDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  partnerId: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  featureId: string;

  @IsBoolean()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
