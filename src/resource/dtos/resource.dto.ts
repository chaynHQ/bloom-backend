import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsDefined } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class ResourceDto {
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  id: string;

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

  @SecureInput('text', { maxLength: 100 })
  @ApiProperty({ type: String, required: false })
  storyblokUuid?: string;
}
