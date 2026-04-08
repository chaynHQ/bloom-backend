import { Module } from '@nestjs/common';
import { FrontChatController } from './front-chat.controller';
import { FrontChatService } from './front-chat.service';

@Module({
  providers: [FrontChatService],
  controllers: [FrontChatController],
  exports: [FrontChatService],
})
export class FrontChatModule {}
