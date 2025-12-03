import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class UserParamDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String, description: 'User ID (UUID)' })
  id: string;
}