import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionRepository } from './session.repository';
import { SessionService } from './session.service';

@Module({
  imports: [TypeOrmModule.forFeature([SessionRepository])],
  providers: [SessionService],
})
export class SessionModule {}
