import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  name: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  contactPermission: boolean;
}
