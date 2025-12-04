import { ApiProperty } from '@nestjs/swagger';
import { SecureInput } from '../../utils/sanitization.decorators';

export class DeleteFeatureDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  featureId: string;
}
