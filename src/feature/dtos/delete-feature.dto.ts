import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDefined } from 'class-validator';

export class DeleteFeatureDto {
  @IsUUID(4, { message: 'featureId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  featureId: string;
}
