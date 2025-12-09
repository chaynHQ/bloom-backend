import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';

export class UpdatePartnerAdminDto {
  @IsBoolean()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
