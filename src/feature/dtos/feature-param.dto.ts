import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimWhitespace, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class FeatureParamDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MaxLength(36, { message: 'Feature ID must be a valid UUID' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String, description: 'Feature ID' })
  id: string;
}