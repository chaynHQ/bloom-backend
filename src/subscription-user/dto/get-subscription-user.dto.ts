import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDefined, IsOptional, IsUUID } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

@Expose()
export class GetSubscriptionUserDto {
  @ApiProperty()
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  id: string;

  @ApiProperty()
  @IsUUID(4, { message: 'subscriptionId must be a valid UUID' })
  @IsDefined()
  subscriptionId: string;

  @ApiProperty()
  @SecureInput('text', { required: true, maxLength: 255 })
  @IsDefined()
  @Expose()
  subscriptionName: string;

  @ApiProperty()
  @SecureInput('text', { required: true, maxLength: 5000 })
  @IsDefined()
  subscriptionInfo: string;

  @ApiProperty()
  @IsDefined()
  createdAt: Date;

  @ApiProperty()
  @IsOptional()
  cancelledAt: Date | null;
}
