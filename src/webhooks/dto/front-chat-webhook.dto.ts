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

export class FrontWebhookMessageAuthor {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;
}

class FrontWebhookMessageData {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsObject()
  author?: FrontWebhookMessageAuthor;
}

class FrontWebhookTarget {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  data?: FrontWebhookMessageData;
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

  @ApiProperty()
  @IsOptional()
  @IsObject()
  target?: FrontWebhookTarget;
}
