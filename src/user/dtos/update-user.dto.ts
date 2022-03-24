import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  contactPermission: boolean;
}
