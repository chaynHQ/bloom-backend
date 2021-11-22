import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRepository]), FirebaseModule],
  controllers: [UserController],
  providers: [UserService, AuthService],
})
export class UserModule {}
