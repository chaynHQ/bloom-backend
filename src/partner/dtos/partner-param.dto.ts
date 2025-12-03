import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class PartnerParamDto {
  @SecureInput('text', { required: true, maxLength: 50 })
  @IsDefined()
  @ApiProperty({ type: String, description: 'Partner name' })
  name: string;
}

export class PartnerIdParamDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @IsDefined()
  @ApiProperty({ type: String, description: 'Partner ID' })
  id: string;
}