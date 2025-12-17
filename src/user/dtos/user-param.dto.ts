import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';

export class UserParamDto {
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String, description: 'User ID (UUID)' })
  id: string;
}