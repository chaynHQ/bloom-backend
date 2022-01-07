import { Module } from '@nestjs/common';
import { SessionUserController } from './session-user.controller';
import { SessionUserService } from './session-user.service';

@Module({
  controllers: [SessionUserController],
  providers: [SessionUserService]
})
export class SessionUserModule {}
