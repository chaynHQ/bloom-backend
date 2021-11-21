import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ValidatePartnerAccessCodeDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @MaxLength(6)
  @MinLength(6)
  @ApiProperty({ type: String })
  partnerAccessCode: string;
}
