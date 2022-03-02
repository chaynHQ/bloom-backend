import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
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

  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  service_name: string;

  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  booking_code: string;

  @IsDate()
  @IsDefined()
  @ApiProperty({ type: Date })
  start_date_time: Date;

  @IsNotEmpty()
  @IsDate()
  @IsOptional()
  @ApiProperty({ type: Date })
  cancelledAt: Date;

  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  service_provider_name: string;

  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  client_timezone: string;

  @IsNotEmpty()
  @IsDate()
  @IsDefined()
  @ApiProperty({ type: Date })
  end_date_time: Date;

  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  service_provider_email: string;
}
