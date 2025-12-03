import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SanitizeText, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class CreateSubscriptionUserDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(1000, { message: 'Subscription info is too long' })
  @SanitizeText()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  subscriptionInfo: string;
}
