import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDefined, IsOptional } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

@Expose()
export class GetSubscriptionUserDto {
  @ApiProperty()
  @SecureInput('id', { required: true, maxLength: 36 })
  @IsDefined()
  id: string;

  @ApiProperty()
  @SecureInput('id', { required: true, maxLength: 36 })
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
