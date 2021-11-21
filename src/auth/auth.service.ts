import { Inject, Injectable } from '@nestjs/common';
import { FIREBASE } from '../firebase/firebase-factory';
import { FirebaseServices } from '../firebase/firebase.types';
import { UserAuthDto } from './dto/user-auth.dto';

@Injectable()
export class AuthService {
  constructor(@Inject(FIREBASE) private firebase: FirebaseServices) {}

  public async loginFirebaseUser({ email, password }: UserAuthDto) {
    return await this.firebase.auth.signInWithEmailAndPassword(email, password);
  }
}
