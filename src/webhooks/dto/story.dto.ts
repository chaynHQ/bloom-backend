import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from '../../utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class StoryWebhookDto {
  @SecureInput('text', { required: false, maxLength: 10000 })
  text: string;

  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @IsDefined()
  @ApiProperty({ type: String })
  action: STORYBLOK_STORY_STATUS_ENUM;

  @IsOptional()
  @IsNumber()
  space_id?: number;

  @SecureInput('text', { required: false, maxLength: 500 })
  full_slug?: string;
}
