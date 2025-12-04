import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CourseDto {
  @SecureInput('text', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  name: string;

  @SecureInput('text', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  slug: string;

  @IsDefined()
  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @ApiProperty({ type: String })
  status: STORYBLOK_STORY_STATUS_ENUM;

  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  storyblokUuid: string;
}
