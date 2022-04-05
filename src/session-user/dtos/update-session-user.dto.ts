import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty } from 'class-validator';

export class UpdateSessionUserDto {
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Number })
  storyblokId: number;
}
