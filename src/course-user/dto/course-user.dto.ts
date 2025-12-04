import { ApiProperty } from '@nestjs/swagger';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CourseUserDto {
  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  userId: string;

  @SecureInput('id', { required: true, maxLength: 36 })
  @ApiProperty({ type: String })
  courseId: string;
}
