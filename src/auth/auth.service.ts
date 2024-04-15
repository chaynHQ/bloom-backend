import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import { Logger } from 'src/logger/logger';
import { FIREBASE } from '../firebase/firebase-factory';
import { FirebaseServices } from '../firebase/firebase.types';
import { UserAuthDto } from './dto/user-auth.dto';

@Injectable()
export class AuthService {
  constructor(@Inject(FIREBASE) private firebase: FirebaseServices) {}
  private readonly logger = new Logger('AuthService');

  public async loginFirebaseUser({ email, password }: UserAuthDto) {
    return await this.firebase.auth.signInWithEmailAndPassword(email, password);
  }

  async parseAuth(header: string): Promise<DecodedIdToken> {
    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Unauthorized: auth header not in the required format - should be "Bearer {token}"',
      );
    }

    const idToken = header.split('Bearer ')[1];

    const decodedToken = await this.parseAndValidateToken(idToken);

    return decodedToken;
  }

  private async parseAndValidateToken(token: string): Promise<DecodedIdToken> {
    const decodedToken = await this.firebase.admin.auth().verifyIdToken(token);

    return decodedToken;
  }

  public async createFirebaseUser(email: string, password: string) {
    const userRecord = await this.firebase.admin.auth().createUser({
      email,
      password,
    });
    return userRecord;
  }

  public async getFirebaseUser(email: string) {
    const userRecord = await this.firebase.admin.auth().getUserByEmail(email);
    return userRecord;
  }

  public async deleteFirebaseUser(firebaseUid: string) {
    try {
      await this.firebase.admin.auth().deleteUser(firebaseUid);
      return 'ok';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  public async deleteCypressFirebaseUsers() {
    const allUsers = [];

    try {
      this.firebase.admin
        .auth()
        .listUsers(1000)
        .then((listUsersResult) => {
          listUsersResult.users.forEach((userRecord) => {
            if (userRecord.email.includes('cypresstestemail')) {
              allUsers.push(userRecord.uid);
            }
          });
          this.firebase.admin
            .auth()
            .deleteUsers(allUsers)
            .then((deleteUsersResult) => {
              if (deleteUsersResult.successCount > 0) {
                this.logger.log(
                  `Successfully deleted ${deleteUsersResult.successCount} cypress firebase users`,
                );
              }

              if (deleteUsersResult.failureCount > 0) {
                this.logger.error(
                  `Failed to delete ${deleteUsersResult.failureCount} cypress firebase users`,
                );
              }
              if (deleteUsersResult.errors.length > 0) {
                this.logger.error(
                  `Errors deleting cypress firebase users - ${deleteUsersResult.errors}`,
                );
              }
            });
        });
      return 'ok';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
