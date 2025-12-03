import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { FEEDBACK_TAGS_ENUM } from 'src/utils/constants';
import { TrimWhitespace, SanitizeHtml, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class CreateResourceFeedbackDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(36, { message: 'Resource ID must be a valid UUID' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  resourceId: string;

  @IsNotEmpty()
  @IsEnum(FEEDBACK_TAGS_ENUM)
  @ApiProperty({
    enum: FEEDBACK_TAGS_ENUM,
    type: String,
    example: Object.values(FEEDBACK_TAGS_ENUM),
  })
  feedbackTags: FEEDBACK_TAGS_ENUM;

  @IsString()
  @MaxLength(5000, { message: 'Feedback description is too long' })
  @SanitizeHtml({ ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'] })
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  feedbackDescription: string;
}
