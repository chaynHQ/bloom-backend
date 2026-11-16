import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class ResourceUserDto {
  @SecureInput('text', { required: true, maxLength: 100 })
  @IsDefined()
  @ApiProperty({ type: String })
  storyblokUuid: string;

  // Set when the resource is opened inside a modular course, so the course counts as started.
  @SecureInput('text', { maxLength: 100 })
  @ApiProperty({ type: String, required: false })
  courseStoryblokUuid?: string;
}
