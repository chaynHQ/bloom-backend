import { ApiProperty } from '@nestjs/swagger';
import { SecureInput } from '../../utils/sanitization.decorators';

export class UserAuthDto {
  @SecureInput('email', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  email: string;

  @SecureInput('password', { required: true, maxLength: 128 })
  @ApiProperty({ type: String })
  password: string;
}
