import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ZAPIER_ACTION_ENUM } from '../../utils/constants';

export class ZapierBodyDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @IsEnum(ZAPIER_ACTION_ENUM)
  @ApiProperty({ type: String })
  action: ZAPIER_ACTION_ENUM;

  @IsNotEmpty()
  @IsEmail()
  @IsDefined()
  @ApiProperty({ type: String })
  client_email: string;
}
