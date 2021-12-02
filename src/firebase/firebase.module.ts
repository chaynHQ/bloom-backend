import { Module } from '@nestjs/common';
import { FIREBASE, firebaseFactory } from './firebase-factory';

@Module({
  providers: [firebaseFactory],
  exports: [FIREBASE],
})
export class FirebaseModule {}
