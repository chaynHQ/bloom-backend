import { ApiProperty } from '@nestjs/swagger';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';

export class GetSessionUserDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  createdAt: Date | string;

  @ApiProperty({ type: String })
  updatedAt: Date | string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({ type: String })
  storyblokUuid: string;

  @ApiProperty({ enum: STORYBLOK_STORY_STATUS_ENUM })
  status: STORYBLOK_STORY_STATUS_ENUM;

  @ApiProperty({ type: Boolean })
  completed: boolean;
}

export class GetCourseUserDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  createdAt: Date | string;

  @ApiProperty({ type: String })
  updatedAt: Date | string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({ enum: STORYBLOK_STORY_STATUS_ENUM })
  status: STORYBLOK_STORY_STATUS_ENUM;

  @ApiProperty({ type: String })
  storyblokUuid: string;

  @ApiProperty({ type: Boolean })
  completed: boolean;

  @ApiProperty({ type: [GetSessionUserDto] })
  sessions?: GetSessionUserDto[];
}
