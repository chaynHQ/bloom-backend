import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class TherapySessionParamDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String, description: 'Therapy Session ID (UUID)' })
  id: string;
}