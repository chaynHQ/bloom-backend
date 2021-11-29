import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
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
}
