import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { FEEDBACK_TAGS_ENUM } from 'src/utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CreateResourceFeedbackDto {
  @SecureInput('id', { required: true, maxLength: 36 })
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

  @SecureInput('html', { maxLength: 5000 })
  @ApiProperty({ type: String })
  feedbackDescription: string;
}
