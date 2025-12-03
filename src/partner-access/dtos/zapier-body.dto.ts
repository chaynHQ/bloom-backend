import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SIMPLYBOOK_ACTION_ENUM } from '../../utils/constants';
import { NormalizeEmail, TrimWhitespace, SanitizeText, IsNotSqlInjection, IsNotXss } from '../../utils/sanitization.decorators';

export class ZapierSimplybookBodyDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @IsEnum(SIMPLYBOOK_ACTION_ENUM)
  @ApiProperty({ type: String })
  action: SIMPLYBOOK_ACTION_ENUM;

  @IsNotEmpty()
  @IsEmail()
  @IsDefined()
  @MaxLength(255, { message: 'Client email is too long' })
  @NormalizeEmail()
  @IsNotSqlInjection()
  @ApiProperty({ type: String })
  client_email: string;

  @IsString()
  @IsOptional()
  @MaxLength(36, { message: 'User ID must be a valid UUID' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  user_id?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  client_timezone: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Booking code is too long' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  booking_code: string;

  @IsString()
  @IsDefined()
  @MaxLength(200, { message: 'Service name is too long' })
  @SanitizeText()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  service_name: string;

  @IsString()
  @IsDefined()
  @MaxLength(200, { message: 'Service provider name is too long' })
  @SanitizeText()
  @IsNotSqlInjection()
  @IsNotXss()
  @ApiProperty({ type: String })
  service_provider_name: string;

  @IsString()
  @IsDefined()
  @MaxLength(255, { message: 'Service provider email is too long' })
  @NormalizeEmail()
  @IsNotSqlInjection()
  @ApiProperty({ type: String })
  service_provider_email: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  start_date_time: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  end_date_time: string;
}
