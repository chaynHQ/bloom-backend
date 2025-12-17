import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsUUID } from 'class-validator';
import { FEEDBACK_TAGS_ENUM } from 'src/utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class SessionFeedbackDto {
  @IsUUID(4, { message: 'sessionId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  sessionId: string;

  @IsDefined()
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
