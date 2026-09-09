import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from '../../utils/constants';

export class StoryWebhookDto {
  // Storyblok-generated notification string (e.g. "Story published: ..."). Signature-verified
  // upstream, never rendered or used in a query (the handler ignores it) — so it is NOT run
  // through the XSS/SQL matcher, which rejects innocuous punctuation like "--", "#" or "..."
  // and was 400ing legitimate publish webhooks.
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  text?: string;

  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @IsDefined()
  @ApiProperty({ type: String })
  action: STORYBLOK_STORY_STATUS_ENUM;

  @IsOptional()
  @IsNumber()
  space_id?: number;

  // Slug path ("folder/leaf"), interpolated into the Storyblok CDN URL. Constrain to the slug
  // charset rather than the generic injection matcher — it can't carry a payload and a false
  // positive breaks the webhook.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^[a-z0-9\-_/]+$/i, { message: 'full_slug contains invalid characters' })
  full_slug?: string;
}
