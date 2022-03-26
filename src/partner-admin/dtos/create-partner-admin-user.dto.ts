import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreatePartnerAdminUserDto {
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  @IsString()
  partnerId: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  firebaseUid: string;
}
