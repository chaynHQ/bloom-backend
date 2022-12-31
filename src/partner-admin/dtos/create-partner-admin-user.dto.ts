import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreatePartnerAdminUserDto {
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  @ApiProperty({ type: String })
  name: string;

  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(3)
  partnerId: string;
}
