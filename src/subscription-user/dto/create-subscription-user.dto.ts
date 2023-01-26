import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class CreateSubscriptionUserDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  subscriptionInfo: string;
}
