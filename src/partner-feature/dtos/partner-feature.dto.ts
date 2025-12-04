import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class PartnerFeatureDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  partnerFeatureId: string;

  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  featureId: string;

  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  partnerId: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
