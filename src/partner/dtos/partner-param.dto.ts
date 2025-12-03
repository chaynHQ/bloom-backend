import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimWhitespace, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class PartnerParamDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(50, { message: 'Partner name is too long' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String, description: 'Partner name' })
  name: string;
}

export class PartnerIdParamDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(36, { message: 'Partner ID must be a valid UUID' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String, description: 'Partner ID' })
  id: string;
}