import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class GetFeatureDto {
  @ApiProperty()
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  id: string;

  @ApiProperty()
  @SecureInput('text', { required: true, maxLength: 255 })
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsDefined()
  createdAt: Date;

  @ApiProperty()
  @IsDefined()
  updatedAt: Date;
}
