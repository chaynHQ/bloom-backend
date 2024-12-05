import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RESOURCE_CATEGORIES, STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';

export class CreateResourceDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  name: string;

  @IsNotEmpty()
  @IsString()
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

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  storyblokUuid?: string;
}
