import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CreatePartnerFeatureDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @IsDefined()
  @ApiProperty({ type: String })
  partnerId: string;

  @SecureInput('id', { required: true, maxLength: 36 })
  @IsDefined()
  @ApiProperty({ type: String })
  featureId: string;

  @IsBoolean()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
