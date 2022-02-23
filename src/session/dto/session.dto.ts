import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';

export class SessionDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  name: string;

  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  slug: string;

  @IsEnum(STORYBLOK_STORY_STATUS_ENUM)
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  status: STORYBLOK_STORY_STATUS_ENUM;

  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Number })
  storyblokId: number;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  courseId: string;
}
