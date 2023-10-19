import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNotEmpty } from 'class-validator';

export class UpdatePartnerAdminDto {
  @IsNotEmpty()
  @IsBoolean()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  active: boolean;
}
