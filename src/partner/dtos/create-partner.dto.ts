import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SanitizeText, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class CreatePartnerDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @MaxLength(50, { message: 'Partner name is too long' })
  @SanitizeText()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  name: string;
}
