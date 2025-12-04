import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class GetPartnerAccessesDto {
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  featureLiveChat: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean })
  featureTherapy: boolean;

  @IsInt()
  @IsOptional()
  @ApiProperty({ type: Number })
  therapySessionsRemaining: number;

  @IsInt()
  @IsOptional()
  @ApiProperty({ type: Number })
  therapySessionsRedeemed: number;

  @SecureInput('text', { maxLength: 6 })
  @ApiProperty({ type: String })
  accessCode: string;
}
