import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class GetPartnerFeatureDto {
  @SecureInput('id', { maxLength: 36 })
  @ApiProperty({ type: String })
  partnerFeatureId: string;

  @SecureInput('id', { maxLength: 36 })
  @ApiProperty({ type: String })
  featureId: string;

  @SecureInput('id', { maxLength: 36 })
  @ApiProperty({ type: String })
  partnerId: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
