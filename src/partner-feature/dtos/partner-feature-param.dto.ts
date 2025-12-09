import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class PartnerFeatureParamDto {
  @IsUUID(4, { message: 'id must be a valid UUID' })
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