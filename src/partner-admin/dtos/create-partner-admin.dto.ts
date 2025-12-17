import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';

export class CreatePartnerAdminDto {
  @IsUUID(4, { message: 'userId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  userId: string;

  @IsUUID(4, { message: 'partnerId must be a valid UUID' })
  @IsDefined()
  @ApiProperty({ type: String })
  partnerId: string;
}
