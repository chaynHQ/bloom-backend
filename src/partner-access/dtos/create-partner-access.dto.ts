import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsInt, Max, Min } from 'class-validator';

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
  @Min(0)
  // We should programatically set this per partner set up in the future
  @Max(6)
  @IsDefined()
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsInt()
  @Min(0)
  @IsDefined()
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;
}
