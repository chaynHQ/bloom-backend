import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum } from 'class-validator';
import { SIMPLYBOOK_ACTION_ENUM } from '../../utils/constants';
import { SecureInput } from '../../utils/sanitization.decorators';

export class ZapierSimplybookBodyDto {
  @IsEnum(SIMPLYBOOK_ACTION_ENUM)
  @IsDefined()
  @ApiProperty({ type: String })
  action: SIMPLYBOOK_ACTION_ENUM;

  @SecureInput('email', { required: true, maxLength: 255 })
  @IsDefined()
  @ApiProperty({ type: String })
  client_email: string;

  @SecureInput('id', { required: false, maxLength: 36 })
  @ApiProperty({ type: String })
  user_id?: string;

  @SecureInput('text', { required: false, maxLength: 50 })
  @ApiProperty({ type: String })
  client_timezone: string;

  @SecureInput('text', { required: true, maxLength: 100 })
  @IsDefined()
  @ApiProperty({ type: String })
  booking_code: string;

  @SecureInput('text', { required: true, maxLength: 200 })
  @IsDefined()
  @ApiProperty({ type: String })
  service_name: string;

  @SecureInput('text', { required: true, maxLength: 200 })
  @IsDefined()
  @ApiProperty({ type: String })
  service_provider_name: string;

  @SecureInput('email', { required: true, maxLength: 255 })
  @IsDefined()
  @ApiProperty({ type: String })
  service_provider_email: string;

  @SecureInput('text', { required: true, maxLength: 50 })
  @IsDefined()
  @ApiProperty({ type: String })
  start_date_time: string;

  @SecureInput('text', { required: true, maxLength: 50 })
  @IsDefined()
  @ApiProperty({ type: String })
  end_date_time: string;
}
