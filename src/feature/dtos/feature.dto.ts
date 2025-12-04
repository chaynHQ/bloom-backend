import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class Feature {
  @SecureInput('text', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  name: string;

  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  id: string;
}
