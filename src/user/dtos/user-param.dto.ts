import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsUUID } from 'class-validator';
import { TrimWhitespace, IsNotSqlInjection } from '../../utils/sanitization.decorators';

export class UserParamDto {
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsNotEmpty()
  @IsDefined()
  @TrimWhitespace()
  @IsNotSqlInjection()
  @ApiProperty({ type: String, description: 'User ID (UUID)' })
  id: string;
}