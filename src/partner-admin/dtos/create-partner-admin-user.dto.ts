import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';
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

  @IsUUID(4, { message: 'partnerId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  partnerId: string;
}
