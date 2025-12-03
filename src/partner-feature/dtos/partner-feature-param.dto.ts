import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class PartnerFeatureParamDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @IsDefined()
  @ApiProperty({ type: String, description: 'Partner feature ID' })
  id: string;
}

export class PartnerNameParamDto {
  @SecureInput('text', { required: true, maxLength: 50 })
  @IsDefined()
  @ApiProperty({ type: String, description: 'Partner name' })
  partnerName: string;
}