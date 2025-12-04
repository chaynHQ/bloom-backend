import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { SecureInput } from '../../utils/sanitization.decorators';

export class UserQueryDto {
  @SecureInput('text', { required: false, maxLength: 10000 })
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
  @ApiProperty({ 
    type: String, 
    required: false, 
    description: 'JSON string for search criteria' 
  })
  searchCriteria?: string;
}