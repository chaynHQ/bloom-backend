import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RESOURCE_CATEGORIES, STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class GetResourceDto {
  @ApiProperty()
  @IsUUID(4, { message: 'id must be a valid UUID' })
  @IsDefined()
  id: string;

  @ApiProperty()
  @SecureInput('text', { required: true, maxLength: 255 })
  @IsDefined()
  name: string;

  @ApiProperty()
  @SecureInput('text', { required: true, maxLength: 255 })
  @IsDefined()
  slug: string;

  @ApiProperty({ enum: STORYBLOK_STORY_STATUS_ENUM, type: String, required: false })
  @IsOptional()
  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  status?: STORYBLOK_STORY_STATUS_ENUM;

  @ApiProperty({ enum: RESOURCE_CATEGORIES, type: String })
  @IsDefined()
  @IsEnum(RESOURCE_CATEGORIES)
  category: RESOURCE_CATEGORIES;

  @ApiProperty({ type: String, required: false })
  @SecureInput('text', { maxLength: 100 })
  @IsOptional()
  storyblokUuid?: string;

  @ApiProperty()
  @IsDefined()
  createdAt: Date;

  @ApiProperty()
  @IsDefined()
  updatedAt: Date;
}
