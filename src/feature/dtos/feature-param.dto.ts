import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class FeatureParamDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @IsDefined()
  @ApiProperty({ type: String, description: 'Feature ID' })
  id: string;
}