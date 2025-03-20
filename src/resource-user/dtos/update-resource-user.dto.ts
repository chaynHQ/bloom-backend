import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty } from 'class-validator';

export class UpdateResourceUserDto {
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  storyblokUuid: string;
}
