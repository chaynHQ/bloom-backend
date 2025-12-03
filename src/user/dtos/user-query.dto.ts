import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class UserQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'searchCriteria is too long' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    // Basic validation that it's valid JSON structure before parsing
    try {
      JSON.parse(value);
      return value;
    } catch {
      return '';
    }
  })
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ 
    type: String, 
    required: false, 
    description: 'JSON string for search criteria' 
  })
  searchCriteria?: string;
}