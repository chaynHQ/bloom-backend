import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class DeletePartnerDto {
  @IsNotEmpty()
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String })
  partnerId: string;
}
