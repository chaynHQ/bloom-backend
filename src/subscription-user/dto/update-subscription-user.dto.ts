import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class UpdateSubscriptionUserDto {
  @IsBoolean()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  isActive: boolean;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  id: string;
}
