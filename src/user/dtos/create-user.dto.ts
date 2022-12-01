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

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  firebaseUid: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  partnerAccessCode?: string;

  @IsDefined()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  contactPermission: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String })
  signUpLanguage: string;
}
