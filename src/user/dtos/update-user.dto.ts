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

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  serviceEmailsPermission: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  signUpLanguage: string;
}
