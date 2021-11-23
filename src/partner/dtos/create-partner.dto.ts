import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class CreatePartnerDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  name: string;

  @IsString()
  @ApiProperty({ type: String })
  logo: string;

  @IsString()
  @ApiProperty({ type: String })
  primaryColour: string;
}
