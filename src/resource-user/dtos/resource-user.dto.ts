import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ResourceUserDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  resourceId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  userId: string;

  @IsBoolean()
  @ApiProperty({ type: Date })
  completedAt?: Date;
}
