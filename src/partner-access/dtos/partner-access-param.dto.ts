import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';

export class PartnerAccessParamDto {
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String, description: 'Partner Access ID (UUID)' })
  id: string;
}