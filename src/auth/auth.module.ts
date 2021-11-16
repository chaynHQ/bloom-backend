import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule],
  providers: [],
})
export class AuthModule {}
