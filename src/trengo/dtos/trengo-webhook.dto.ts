import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

// Represents a contact embedded in a Trengo webhook payload
class TrengoWebhookContact {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

// DTO for Trengo webhook payloads.
// Trengo webhooks deliver event data via HTTP POST with a Trengo-Signature header.
// See https://developers.trengo.com/docs/payload
export class TrengoWebhookDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false })
  message_id?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false })
  ticket_id?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false })
  contact_id?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false })
  channel_id?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ type: Number, required: false, description: 'Agent user ID (for outbound)' })
  user_id?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  user_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  user_email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: String, required: false })
  message?: string;

  @IsOptional()
  @ApiProperty({ required: false, description: 'Contact details embedded in the event' })
  contact?: TrengoWebhookContact;
}
