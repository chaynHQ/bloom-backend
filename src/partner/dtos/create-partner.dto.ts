import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CreatePartnerDto {
  @SecureInput('text', { required: true, maxLength: 50 })
  @IsDefined()
  @ApiProperty({ type: String })
  name: string;
}
