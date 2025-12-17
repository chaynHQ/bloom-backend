import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID, IsDefined } from 'class-validator';

export class ResourceUserDto {
  @IsUUID(4, { message: 'resourceId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  resourceId: string;

  @IsUUID(4, { message: 'userId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  userId: string;

  @IsBoolean()
  @ApiProperty({ type: Date })
  completedAt?: Date;
}
