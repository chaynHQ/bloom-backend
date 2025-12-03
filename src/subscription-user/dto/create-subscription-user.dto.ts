import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CreateSubscriptionUserDto {
  @SecureInput('text', { required: true, maxLength: 1000 })
  @IsDefined()
  @ApiProperty({ type: String })
  subscriptionInfo: string;
}
