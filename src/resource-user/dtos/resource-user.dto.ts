import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class ResourceUserDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  resourceId: string;

  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  userId: string;

  @IsBoolean()
  @ApiProperty({ type: Date })
  completedAt?: Date;
}
