import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class UpdateSessionUserDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Number })
  storyblokId: number;
}
