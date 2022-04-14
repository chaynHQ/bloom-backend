import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class SessionUserDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  sessionId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ type: String })
  courseUserId: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  completed?: boolean;

  @IsBoolean()
  @ApiProperty({ type: Date })
  completedAt?: Date;
}
