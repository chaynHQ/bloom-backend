import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import { Logger } from 'src/logger/logger';
import { FIREBASE_ERRORS } from 'src/utils/errors';
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
    try {
      const firebaseUser = await this.firebase.admin.auth().createUser({
        email,
        password,
      });
      this.logger.log(`Create user: Firebase user created: ${email}`);
      return firebaseUser;
    } catch (err) {
      const errorCode = err.code;

      if (errorCode === 'auth/invalid-email') {
        this.logger.warn(
          `Create user: user tried to create email with invalid email: ${email} - ${err}`,
        );
        throw new HttpException(FIREBASE_ERRORS.CREATE_USER_INVALID_EMAIL, HttpStatus.BAD_REQUEST);
      } else if (errorCode === 'auth/weak-password' || errorCode === 'auth/invalid-password') {
        this.logger.warn(`Create user: user tried to create email with weak password - ${err}`);
        throw new HttpException(FIREBASE_ERRORS.CREATE_USER_WEAK_PASSWORD, HttpStatus.BAD_REQUEST);
      } else if (
        errorCode === 'auth/email-already-in-use' ||
        errorCode === 'auth/email-already-exists'
      ) {
        this.logger.warn(`Create user: Firebase user already exists: ${email}`);
        throw new HttpException(FIREBASE_ERRORS.CREATE_USER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
      } else {
        this.logger.error(`Create user: Error creating firebase user - ${email}: ${err}`);
        throw new HttpException(FIREBASE_ERRORS.CREATE_USER_FIREBASE_ERROR, HttpStatus.BAD_REQUEST);
      }
    }
  }

  public async updateFirebaseUserEmail(firebaseUid: string, newEmail: string) {
    try {
      const firebaseUser = await this.firebase.admin.auth().updateUser(firebaseUid, {
        email: newEmail,
      });
      return firebaseUser;
    } catch (err) {
      const errorCode = err.code;

      if (errorCode === 'auth/invalid-email') {
        this.logger.warn({
          error: FIREBASE_ERRORS.UPDATE_USER_INVALID_EMAIL,
          status: HttpStatus.BAD_REQUEST,
        });
        throw new HttpException(FIREBASE_ERRORS.UPDATE_USER_INVALID_EMAIL, HttpStatus.BAD_REQUEST);
      } else if (
        errorCode === 'auth/email-already-in-use' ||
        errorCode === 'auth/email-already-exists'
      ) {
        this.logger.warn({
          error: FIREBASE_ERRORS.UPDATE_USER_ALREADY_EXISTS,
          status: HttpStatus.BAD_REQUEST,
        });
        throw new HttpException(FIREBASE_ERRORS.UPDATE_USER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
      } else {
        this.logger.warn({
          error: FIREBASE_ERRORS.UPDATE_USER_FIREBASE_ERROR,
          errorMessage: errorCode,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
        throw new HttpException(
          FIREBASE_ERRORS.CREATE_USER_FIREBASE_ERROR,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  public async getFirebaseUser(email: string) {
    const firebaseUser = await this.firebase.admin.auth().getUserByEmail(email);
    return firebaseUser;
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
