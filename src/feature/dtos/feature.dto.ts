import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class Feature {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  name: string;

  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  id: string;
}
