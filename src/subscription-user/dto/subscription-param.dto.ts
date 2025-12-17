import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';

export class SubscriptionParamDto {
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String, description: 'Subscription ID (UUID)' })
  id: string;
}