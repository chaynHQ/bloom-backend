import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';

export class StoryDto {
  @IsOptional()
  @IsString()
  text: string;

  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  action: STORYBLOK_STORY_STATUS_ENUM;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Number })
  storyblokId: number;

  @IsOptional()
  @IsNumber()
  space_id?: number;
}
