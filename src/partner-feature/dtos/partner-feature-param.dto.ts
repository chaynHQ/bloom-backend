import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimWhitespace, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class PartnerFeatureParamDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(36, { message: 'Partner feature ID must be a valid UUID' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String, description: 'Partner feature ID' })
  id: string;
}

export class PartnerNameParamDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(50, { message: 'Partner name is too long' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String, description: 'Partner name' })
  partnerName: string;
}