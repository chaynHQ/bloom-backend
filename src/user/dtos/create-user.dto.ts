import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  email: string;

  // @IsStrongPassword()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  password: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  partnerAccessCode?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  partnerId?: string;

  @IsDefined()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  contactPermission: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  serviceEmailsPermission: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  signUpLanguage: string;
}
