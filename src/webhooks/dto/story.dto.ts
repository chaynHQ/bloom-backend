import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from '../../utils/constants';

export class StoryWebhookDto {
  @IsOptional()
  @IsString()
  text: string;

  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  action: STORYBLOK_STORY_STATUS_ENUM;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  story_uuid: string;

  @IsOptional()
  @IsNumber()
  space_id?: number;

  @IsOptional()
  @IsString()
  full_slug?: string;
}
