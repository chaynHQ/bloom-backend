import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail, IsString } from 'class-validator';

export class CourseUserDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ type: String })
  userId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  courseId: string;
}
