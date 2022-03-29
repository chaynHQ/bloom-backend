import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNotEmpty } from 'class-validator';

export class UpdateSessionUserDto {
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Number })
  storyblokId: number;

  @IsBoolean()
  @IsDefined()
  @IsNotEmpty()
  @ApiProperty({ type: Boolean })
  completed: boolean;
}
