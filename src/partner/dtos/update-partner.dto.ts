import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePartnerDto {
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  active: boolean;
}