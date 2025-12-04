import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class UpdateSessionUserDto {
  @SecureInput('text', { required: true, maxLength: 100 })
  @IsDefined()
  @ApiProperty({ type: String })
  storyblokUuid: string;
}
