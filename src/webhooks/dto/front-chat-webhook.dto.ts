import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

class FrontWebhookRecipient {
  @IsString()
  handle: string;

  @IsString()
  role: string;
}

class FrontWebhookConversation {
  @IsString()
  id: string;

  @IsOptional()
  @IsObject()
  recipient?: FrontWebhookRecipient;
}

export class FrontChatWebhookDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ description: 'Front event type: inbound, outbound, out_reply, etc.' })
  @IsString()
  type: string;

  @ApiProperty()
  @IsNumber()
  emitted_at: number;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  conversation?: FrontWebhookConversation;
}
