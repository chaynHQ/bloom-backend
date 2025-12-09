import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsDefined } from 'class-validator';

export class UpdateSubscriptionUserDto {
  @IsDate()
  @IsDefined()
  @ApiProperty({ type: Date })
  @Type(() => Date)
  cancelledAt: Date;
}
