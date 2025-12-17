import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDefined } from 'class-validator';

export class CourseUserDto {
  @IsUUID(4, { message: 'userId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  userId: string;

  @IsUUID(4, { message: 'courseId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  courseId: string;
}
