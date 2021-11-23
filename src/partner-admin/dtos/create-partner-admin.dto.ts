import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class CreatePartnerAdminDto {
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  @IsString()
  partnerId: string;
}
