import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SIMPLYBOOK_ACTION_ENUM } from '../../utils/constants';

export class SimplybookBodyDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @IsEnum(SIMPLYBOOK_ACTION_ENUM)
  @ApiProperty({ type: String })
  action: SIMPLYBOOK_ACTION_ENUM;

  @IsNotEmpty()
  @IsEmail()
  @IsDefined()
  @ApiProperty({ type: String })
  client_email: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  client_id: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: String })
  client_timezone: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  booking_code: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  service_name: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  service_provider_name: string;

  @IsString()
  @IsDefined()
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
