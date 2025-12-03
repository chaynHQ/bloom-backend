import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail, TrimWhitespace, IsNotSqlInjection } from '../../utils/sanitization.decorators';

export class UserAuthDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255, { message: 'Email is too long' })
  @NormalizeEmail()
  @IsNotSqlInjection()
  @ApiProperty({ type: String })
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(128, { message: 'Password is too long' })
  @TrimWhitespace()
  @IsNotSqlInjection()
  @ApiProperty({ type: String })
  password: string;
}
