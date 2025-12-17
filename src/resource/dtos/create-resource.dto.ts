import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RESOURCE_CATEGORIES, STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CreateResourceDto {
  @SecureInput('text', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  name: string;

  @SecureInput('text', { required: true, maxLength: 255 })
  @ApiProperty({ type: String })
  slug: string;

  @IsOptional()
  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @ApiProperty({ enum: STORYBLOK_STORY_STATUS_ENUM, type: String, required: false })
  status?: STORYBLOK_STORY_STATUS_ENUM;

  @IsOptional()
  @IsEnum(RESOURCE_CATEGORIES)
  @ApiProperty({ enum: RESOURCE_CATEGORIES, type: String, required: false })
  category: RESOURCE_CATEGORIES;

  @SecureInput('text', { maxLength: 100 })
  @ApiProperty({ type: String, required: false })
  storyblokUuid?: string;
}
