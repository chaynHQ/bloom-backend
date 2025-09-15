import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePartnerDto {
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
