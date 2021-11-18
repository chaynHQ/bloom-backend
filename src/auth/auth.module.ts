import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { FirebaseAuthStrategy } from 'src/firebase/firebase-auth.strategy';

@Module({
  imports: [FirebaseModule],
  providers: [AuthService, FirebaseAuthStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
