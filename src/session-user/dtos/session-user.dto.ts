import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class SessionUserDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  sessionId: string;

  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  courseUserId: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  completed?: boolean;

  @IsBoolean()
  @ApiProperty({ type: Date })
  completedAt?: Date;
}
