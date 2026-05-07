import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdatePartnerAccessDto {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  featureLiveChat: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  featureTherapy: boolean;

  @IsInt()
  @Min(0)
  // We should programatically set this per partner set up in the future rather than setting an arbitrary max
  // This DTO is only used on a super admin route so we can trust the input more than usual but this will prevent major abuse of the field. 
  @Max(50)
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;
}
