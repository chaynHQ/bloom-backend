import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ChatUserService } from './chat-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatUserEntity, UserEntity])],
  providers: [ChatUserService],
  exports: [ChatUserService],
})
export class ChatUserModule {}
