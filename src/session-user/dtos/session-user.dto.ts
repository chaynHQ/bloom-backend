import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID, IsDefined } from 'class-validator';

export class SessionUserDto {
  @IsUUID(4, { message: 'sessionId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  sessionId: string;

  @IsUUID(4, { message: 'courseUserId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  courseUserId: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  completed?: boolean;

  @IsBoolean()
  @ApiProperty({ type: Date })
  completedAt?: Date;
}
