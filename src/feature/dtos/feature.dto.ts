import { ApiProperty } from '@nestjs/swagger';
import { SecureInput } from '../../utils/sanitization.decorators';

export class Feature {
  @SecureInput('text', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  name: string;

  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  id: string;
}
