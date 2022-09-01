import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator/types/decorator/decorators';
import { CAMPAIGN_TYPE } from 'src/utils/constants';

export class EmailCampaignDto {
  @IsEnum(CAMPAIGN_TYPE)
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  campaignType: CAMPAIGN_TYPE;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  email: string;

  @IsDate()
  @ApiProperty({ type: Date })
  emailSentDateTime: Date;
}
