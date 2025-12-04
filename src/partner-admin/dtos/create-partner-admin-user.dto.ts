import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CreatePartnerAdminUserDto {
  @SecureInput('text', { required: true, maxLength: 255 })
  @IsDefined()
  @ApiProperty({ type: String })
  name: string;

  @SecureInput('email', { required: true, maxLength: 255 })
  @IsDefined()
  @ApiProperty({ type: String })
  email: string;

  @SecureInput('id', { required: true, maxLength: 36 })
  @IsDefined()
  @ApiProperty({ type: String })
  partnerId: string;
}
