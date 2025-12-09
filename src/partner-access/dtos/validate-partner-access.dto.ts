import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class ValidatePartnerAccessCodeDto {
  @SecureInput('text', { required: true, maxLength: 6 })
  @IsDefined()
  @ApiProperty({ type: String })
  partnerAccessCode: string;
}
