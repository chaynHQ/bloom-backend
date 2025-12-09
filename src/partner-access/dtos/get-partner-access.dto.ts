import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class GetPartnerAccessesDto {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  featureLiveChat: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  featureTherapy: boolean;

  @IsOptional()
  @IsInt()
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;

  @SecureInput('text', { maxLength: 6 })
  @ApiProperty({ type: String })
  accessCode: string;
}
