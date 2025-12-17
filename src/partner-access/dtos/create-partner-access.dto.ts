import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsDefined } from 'class-validator';

export class CreatePartnerAccessDto {
  @IsBoolean()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  featureLiveChat: boolean;

  @IsBoolean()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  featureTherapy: boolean;

  @IsInt()
  @IsDefined()
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsInt()
  @IsDefined()
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;
}
