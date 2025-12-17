import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNumber, IsOptional } from 'class-validator';
import { SecureInput } from '../../utils/sanitization.decorators';
import { CrispProfileCustomFields } from '../crisp.interface';

export interface CrispUserData extends CrispProfileCustomFields {
  email: string;
  nickname: string;
  user_id: string;
}

export class CrispEventDto {
  @SecureInput('text', { required: true, maxLength: 100 })
  @IsDefined()
  @ApiProperty({ type: String })
  website_id: string;

  @SecureInput('text', { required: true, maxLength: 100 })
  @IsDefined()
  @ApiProperty({ type: String })
  session_id: string;

  @SecureInput('text', { maxLength: 100 })
  @ApiProperty({ type: String })
  inbox_id: string;

  @SecureInput('text', { maxLength: 100 })
  @ApiProperty({ type: String })
  type: string;

  @SecureInput('text', { maxLength: 255 })
  @ApiProperty({ type: String })
  origin: string;

  @SecureInput('html', { required: true, maxLength: 5000 })
  @IsDefined()
  @ApiProperty({ type: String })
  content: string;

  @SecureInput('text', { required: true, maxLength: 255 })
  @IsDefined()
  @ApiProperty({ type: String })
  from: string;

  @IsNumber()
  @IsDefined()
  @ApiProperty({ type: Number })
  timestamp: number;

  @IsNumber()
  @IsDefined()
  @ApiProperty({ type: Number })
  fingerprint: number;

  @IsOptional()
  @IsNumber()
  space_id?: number;

  @SecureInput('text', { maxLength: 500 })
  full_slug?: string;

  @IsBoolean()
  stamped: boolean;

  user: CrispUserData;
}
