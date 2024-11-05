import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CrispProfileCustomFields } from '../crisp.interface';

export interface CrispUserData extends CrispProfileCustomFields {
  email: string;
  nickname: string;
  user_id: string;
}

export class CrispEventDto {
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  website_id: string;

  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  session_id: string;

  @IsOptional()
  @ApiProperty({ type: String })
  inbox_id: string;

  @IsOptional()
  @ApiProperty({ type: String })
  type: string;

  @IsOptional()
  @ApiProperty({ type: String })
  origin: string;

  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  content: string;

  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: String })
  from: string;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Number })
  timestamp: number;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({ type: Number })
  fingerprint: number;

  @IsOptional()
  @IsNumber()
  space_id?: number;

  @IsOptional()
  @IsString()
  full_slug?: string;

  @IsBoolean()
  stamped: boolean;

  user: CrispUserData;
}
