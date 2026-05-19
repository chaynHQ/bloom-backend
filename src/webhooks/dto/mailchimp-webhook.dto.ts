import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class MailchimpWebhookData {
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class MailchimpWebhookDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  fired_at?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => MailchimpWebhookData)
  data: MailchimpWebhookData;
}
