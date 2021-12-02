import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean, IsInt, IsDefined } from 'class-validator';

export class CreatePartnerAccessDto {
  @IsNotEmpty()
  @IsBoolean()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  featureLiveChat: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @IsDefined()
  @ApiProperty({ type: Boolean })
  featureTherapy: boolean;

  @IsNotEmpty()
  @IsInt()
  @IsDefined()
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsNotEmpty()
  @IsInt()
  @IsDefined()
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;
}
