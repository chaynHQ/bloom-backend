import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsDefined, IsNotEmpty } from 'class-validator';

export class UpdateSubscriptionUserDto {
  @IsDate()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Date })
  @Type(() => Date)
  cancelledAt: Date;
}
