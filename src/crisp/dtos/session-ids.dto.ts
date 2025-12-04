import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMaxSize, IsString, MaxLength, Matches } from 'class-validator';

export class SessionIdsDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(36, { each: true, message: 'Each session ID must not exceed 36 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { each: true, message: 'Each session ID must contain only alphanumeric characters, hyphens, and underscores' })
  @ArrayMaxSize(1000, { message: 'Too many session IDs' })
  @ApiProperty({ 
    type: [String], 
    description: 'Array of session IDs',
    example: ['session1', 'session2'] 
  })
  sessionIds: string[];
}