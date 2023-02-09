import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class DeleteFeatureDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  featureId: string;
}
