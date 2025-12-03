import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from '../../utils/constants';
import { TrimWhitespace, SanitizeText, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class StoryWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'Text is too long' })
  @SanitizeText()
  @IsNotSqlInjection()
  @IsNotXss()
  text: string;

  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  action: STORYBLOK_STORY_STATUS_ENUM;

  @IsOptional()
  @IsNumber()
  space_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Full slug is too long' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  full_slug?: string;
}
