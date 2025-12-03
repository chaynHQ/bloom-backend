import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MaxLength, ArrayMaxSize } from 'class-validator';
import { IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class SessionIdsDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(36, { each: true, message: 'Session ID must be a valid UUID' })
  @ArrayMaxSize(1000, { message: 'Too many session IDs' })
  @IsNotSqlInjection({ each: true })
  @IsNotXss({ each: true })
  @ApiProperty({ 
    type: [String], 
    description: 'Array of session IDs',
    example: ['session1', 'session2'] 
  })
  sessionIds: string[];
}