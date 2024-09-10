import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@Expose()
export class GetSubscriptionUserDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Expose()
  subscriptionName: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  subscriptionInfo: string;

  @ApiProperty()
  @IsDefined()
  createdAt: Date;

  @ApiProperty()
  @IsOptional()
  cancelledAt: Date | null;
}
