import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class CreateSessionUserDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  sessionId: string;
}
