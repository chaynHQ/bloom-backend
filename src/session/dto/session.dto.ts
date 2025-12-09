import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsDefined } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class SessionDto {
  @SecureInput('text', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  name: string;

  @SecureInput('text', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  slug: string;

  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @ApiProperty({ type: String })
  status: STORYBLOK_STORY_STATUS_ENUM;

  @SecureInput('text', { required: true, maxLength: 100 })
  @ApiProperty({ type: String })
  storyblokUuid: string;

  @IsUUID(4, { message: 'courseId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  courseId: string;
}
