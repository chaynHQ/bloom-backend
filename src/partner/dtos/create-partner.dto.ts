import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsOptional, IsString, IsUrl } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';

export class CreatePartnerDto {
  @SecureInput('text', { required: true, maxLength: 50 })
  @IsDefined()
  @ApiProperty({ type: String })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  logo?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  logoAlt?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  partnershipLogo?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  partnershipLogoAlt?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  bloomGirlIllustration?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ type: String, required: false })
  website?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  footerLine1?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  footerLine2?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ type: String, required: false })
  facebookUrl?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ type: String, required: false })
  twitterUrl?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ type: String, required: false })
  instagramUrl?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ type: String, required: false })
  youtubeUrl?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ type: String, required: false })
  tiktokUrl?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ type: String, required: false })
  githubUrl?: string;
}
