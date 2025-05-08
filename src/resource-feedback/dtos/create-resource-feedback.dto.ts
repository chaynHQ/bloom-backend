import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { FEEDBACK_TAGS_ENUM } from 'src/utils/constants';

export class CreateResourceFeedbackDto {
  @IsNotEmpty()
  @IsString()
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
  @ApiProperty({ type: String })
  feedbackDescription: string;
}
