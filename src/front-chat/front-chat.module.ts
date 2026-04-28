import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatController } from './front-chat.controller';
import { FrontChatService } from './front-chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [FrontChatService],
  controllers: [FrontChatController],
  exports: [FrontChatService],
})
export class FrontChatModule {}
