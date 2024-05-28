import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createCrispProfileData } from 'src/api/crisp/utils/createCrispProfileData';
import { UserEntity } from 'src/entities/user.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { Logger } from 'src/logger/logger';
import { PartnerService } from 'src/partner/partner.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { FEATURES } from 'src/utils/constants';
import {
  CREATE_USER_EMAIL_ALREADY_EXISTS,
  CREATE_USER_INVALID_EMAIL,
  CREATE_USER_WEAK_PASSWORD,
} from 'src/utils/errors';
import { ILike, Repository } from 'typeorm';
import {
  addCrispProfile,
  deleteCypressCrispProfiles,
  updateCrispProfileData,
} from '../api/crisp/crisp-api';
import { AuthService } from '../auth/auth.service';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { formatGetUsersObject, formatUserObject } from '../utils/serialize';
import { generateRandomString } from '../utils/utils';
import { CreateUserDto } from './dtos/create-user.dto';
import { GetUserDto } from './dtos/get-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

enum SIGNUP_TYPE {
  PUBLIC_USER = 'PUBLIC_USER',
  PARTNER_USER_WITH_CODE = 'PARTNER_USER_WITH_CODE',
  PARTNER_USER_WITHOUT_CODE = 'PARTNER_USER_WITHOUT_CODE',
}

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private readonly partnerAccessService: PartnerAccessService,
    private readonly partnerService: PartnerService,
    private readonly authService: AuthService,
    private readonly subscriptionUserService: SubscriptionUserService,
    private readonly therapySessionService: TherapySessionService,
  ) {}

  public async createUser(createUserDto: CreateUserDto): Promise<GetUserDto> {
    const { email, partnerAccessCode, partnerId, password } = createUserDto;

    const signUpType =
      partnerAccessCode || partnerId
        ? partnerAccessCode
          ? SIGNUP_TYPE.PARTNER_USER_WITH_CODE
          : SIGNUP_TYPE.PARTNER_USER_WITHOUT_CODE
        : SIGNUP_TYPE.PUBLIC_USER;
    let firebaseUser = null;

    try {
      firebaseUser = await this.authService.createFirebaseUser(email, password);
      this.logger.log(`Create user: Firebase user created: ${email}`);
    } catch (err) {
      const errorCode = err.code;
      if (errorCode === 'auth/invalid-email') {
        this.logger.warn(
          `Create user: user tried to create email with invalid email: ${email} - ${err}`,
        );
        throw new HttpException(CREATE_USER_INVALID_EMAIL, HttpStatus.BAD_REQUEST);
      }
      if (
        errorCode === 'auth/weak-password' ||
        err.message.includes('The password must be a string with at least 6 characters')
      ) {
        this.logger.warn(`Create user: user tried to create email with weak password - ${err}`);
        throw new HttpException(CREATE_USER_WEAK_PASSWORD, HttpStatus.BAD_REQUEST);
      }
      if (errorCode !== 'auth/email-already-in-use' && errorCode !== 'auth/email-already-exists') {
        this.logger.error(`Create user: Error creating firebase user - ${email}: ${err}`);
        throw err;
      } else {
        this.logger.error(
          `Create user: Unable to create firebase user as user already exists: ${email}`,
        );
        throw new HttpException(CREATE_USER_EMAIL_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
      }
    }

    if (!firebaseUser) {
      this.logger.log(
        `Create user: Firebase user already exists so fetching firebase user: ${email}`,
      );

      try {
        firebaseUser = await this.authService.getFirebaseUser(email);
        if (!firebaseUser) {
          throw new Error('Create user: Unable to create firebase user or get firebase user');
        }
      } catch (err) {
        this.logger.error(`Create user: getFirebaseUser error - ${email}: ${err}`);
        throw new HttpException(err, HttpStatus.BAD_REQUEST);
      }
    }

    let formattedUserObject: GetUserDto | null = null;

    try {
      if (signUpType === SIGNUP_TYPE.PARTNER_USER_WITHOUT_CODE) {
        formattedUserObject = await this.createPartnerUserWithoutCode(
          createUserDto,
          firebaseUser.uid,
        );
        this.logger.log(`Create user: (no access code) created partner user in db. User: ${email}`);
      } else if (signUpType === SIGNUP_TYPE.PARTNER_USER_WITH_CODE) {
        formattedUserObject = await this.createPartnerUserWithCode(createUserDto, firebaseUser.uid);
        this.logger.log(
          `Create user: (with access code) created partner user in db. User: ${email}`,
        );
      } else {
        formattedUserObject = await this.createPublicUser(createUserDto, firebaseUser.uid);
        this.logger.log(`Create user: created public user in db. User: ${email}`);
      }

      const partnerSegment =
        signUpType === SIGNUP_TYPE.PUBLIC_USER
          ? 'public'
          : formattedUserObject.partnerAccesses[0].partner.name.toLowerCase();

      await addCrispProfile({
        email: formattedUserObject.user.email,
        person: { nickname: formattedUserObject.user.name },
        segments: [partnerSegment],
      });
      this.logger.log(`Create user: added crisp profile: ${email}`);

      await updateCrispProfileData(
        createCrispProfileData(
          formattedUserObject.user,
          SIGNUP_TYPE.PUBLIC_USER ? [] : formattedUserObject.partnerAccesses,
        ),
        formattedUserObject.user.email,
      );
      this.logger.log(`Create user: updated crisp profile ${email}`);

      return formattedUserObject;
    } catch (error) {
      this.logger.error(`Create user: Error creating user ${email}: ${error}`);
      throw error;
    }
  }

  public async createPublicUser(
    { name, email, contactPermission, serviceEmailsPermission, signUpLanguage }: CreateUserDto,
    firebaseUid: string,
  ) {
    const createUserObject = this.userRepository.create({
      name,
      email,
      firebaseUid,
      contactPermission,
      serviceEmailsPermission,
      signUpLanguage,
    });
    const createUserResponse = await this.userRepository.save(createUserObject);

    return { user: createUserResponse };
  }

  public async createPartnerUserWithoutCode(
    {
      name,
      email,
      contactPermission,
      serviceEmailsPermission,
      signUpLanguage,
      partnerId,
    }: CreateUserDto,
    firebaseUid: string,
  ) {
    const partnerResponse = await this.partnerService.getPartnerWithPartnerFeaturesById(partnerId);
    if (!partnerResponse) {
      throw new HttpException('Invalid partnerId supplied', HttpStatus.BAD_REQUEST);
    }
    const automaticAccessCodePartnerFeature = partnerResponse.partnerFeature.find(
      (pf) => pf.feature.name === FEATURES.AUTOMATIC_ACCESS_CODE,
    );
    if (!automaticAccessCodePartnerFeature) {
      throw new HttpException(
        'Partner does not have automatic access code Feature',
        HttpStatus.BAD_REQUEST,
      );
    }
    const createUserObject = this.userRepository.create({
      name,
      email,
      firebaseUid,
      contactPermission,
      serviceEmailsPermission,
      signUpLanguage,
    });

    const createUserResponse = await this.userRepository.save(createUserObject);
    const partnerAccessWithPartner = await this.partnerAccessService.createAndAssignPartnerAccess(
      partnerResponse,
      createUserResponse.id,
    );

    return formatUserObject({
      ...createUserResponse,
      ...(partnerAccessWithPartner ? { partnerAccess: [partnerAccessWithPartner] } : {}),
    });
  }

  public async createPartnerUserWithCode(
    {
      name,
      email,
      contactPermission,
      serviceEmailsPermission,
      signUpLanguage,
      partnerAccessCode,
    }: CreateUserDto,
    firebaseUid: string,
  ) {
    const partnerAccess =
      await this.partnerAccessService.getValidPartnerAccessCode(partnerAccessCode);

    const createUserObject = this.userRepository.create({
      name,
      email,
      firebaseUid,
      contactPermission,
      serviceEmailsPermission,
      signUpLanguage,
    });

    const createUserResponse = await this.userRepository.save(createUserObject);

    const partnerAccessWithPartner = await this.partnerAccessService.assignPartnerAccessOnSignup(
      partnerAccess,
      createUserResponse.id,
    );

    return formatUserObject({
      ...createUserResponse,
      ...(partnerAccessWithPartner ? { partnerAccess: [partnerAccessWithPartner] } : {}),
    });
  }

  public async getUserByFirebaseId({ uid }: IFirebaseUser): Promise<GetUserDto | undefined> {
    const queryResult = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.partnerAccess', 'partnerAccess')
      .leftJoinAndSelect('user.partnerAdmin', 'partnerAdmin')
      .leftJoinAndSelect('partnerAccess.therapySession', 'therapySession')
      .leftJoinAndSelect('partnerAccess.partner', 'partner')
      .leftJoinAndSelect('partnerAccess.partner', 'partnerAccessPartner')
      .leftJoinAndSelect('partnerAdmin.partner', 'partnerAdminPartner')
      .leftJoinAndSelect('user.courseUser', 'courseUser')
      .leftJoinAndSelect('courseUser.course', 'course')
      .leftJoinAndSelect('courseUser.sessionUser', 'sessionUser')
      .leftJoinAndSelect('sessionUser.session', 'session')
      .leftJoinAndSelect('user.subscriptionUser', 'subscriptionUser')
      .leftJoinAndSelect('subscriptionUser.subscription', 'subscription')
      .where('user.firebaseUid = :uid', { uid })
      .getOne();

    if (!queryResult) {
      throw new HttpException('USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    return formatUserObject(queryResult);
  }

  public async getUserById(id: string): Promise<UserEntity | undefined> {
    const queryResult = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .getOne();

    if (!queryResult) {
      throw new HttpException('USER NOT FOUND', HttpStatus.NOT_FOUND);
    }
    return queryResult;
  }

  public async deleteUser(user: UserEntity): Promise<UserEntity> {
    const randomString = generateRandomString(20);

    try {
      const firebaseResponse = await this.authService.deleteFirebaseUser(user.firebaseUid);
      this.logger.log(`Firebase account deleted for user with ID ${user.id}`);
    } catch (err) {
      // Continue to delete user, even if firebase request fails
      this.logger.error(
        `deleteUser - firebase error. Unable to delete user ${user.email} due to error ${err}`,
      );
    }

    try {
      //TODO Not yet sure if deleting automatically from Crisp is the right thing to do
      // as we don't know whether we need to manually check if there is any safeguarding concerns before we delete.
      // const crispResponse = await deleteCrispProfile(user.email);

      // if they have subscriptions,redact the number
      await this.subscriptionUserService.softDeleteSubscriptionsForUser(user.id, user.email);
      // if they have therapy sessions redact email and delete client from therapy sessions
      await this.therapySessionService.softDeleteTherapySessions(user.id, user.email, randomString);

      //Randomise User Data in DB
      const updateUser = {
        ...user,
        name: randomString,
        email: randomString,
        isActive: false,
      };
      return await this.userRepository.save(updateUser);
    } catch (error) {
      throw new HttpException(
        `Unable to complete deleting user, ${user.email} due to error - ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async deleteUserById(id: string): Promise<UserEntity> {
    const user = await this.getUserById(id);
    return await this.deleteUser(user);
  }

  public async updateUser(updateUserDto: UpdateUserDto, { user: { id } }: GetUserDto) {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new HttpException('USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const updatedUser: UserEntity = {
      ...user,
      ...updateUserDto,
    };

    return await this.userRepository.save(updatedUser);
  }

  public async deleteCypressTestUsers(clean = false): Promise<UserEntity[]> {
    let deletedUsers: UserEntity[] = [];
    try {
      const queryResult = await this.userRepository
        .createQueryBuilder('user')
        .select()
        .where('user.name LIKE :searchTerm', { searchTerm: `%Cypress test%` })
        .getMany();

      deletedUsers = await Promise.all(
        queryResult.map(async (user) => {
          try {
            // TODO: replace me - temporarily disabled due to too many tests accounts to delete, causing 429 errors on crisp API
            // once crisp test users have been cleared using the clean function, and there are <50 test users in crisp, this can be replaced
            // await deleteCrispProfile(user.email);
            await this.authService.deleteFirebaseUser(user.firebaseUid);
            await this.userRepository.delete(user);
            return user;
          } catch (error) {
            await this.userRepository.delete(user);
            throw error;
          }
        }),
      );
    } catch (error) {
      // If this fails we don't want to break cypress tests but we want to be alerted
      this.logger.error(`deleteCypressTestUsers - Unable to delete all cypress users`, error);
    }

    try {
      // Clean remaining user accounts in firebase and crisp that do not have a user record in the db
      // These rogue accounts may be left over from incomplete signups or errors
      if (clean) {
        // Delete all remaining cypress firebase users (e.g. from failed user creations)
        await this.authService.deleteCypressFirebaseUsers();

        // Delete all remaining crisp accounts
        await deleteCypressCrispProfiles();
      }
    } catch (error) {
      // If this fails we don't want to break cypress tests but we want to be alerted
      this.logger.error(`deleteCypressTestUsers - Unable to clean all cypress users`, error);
    }

    this.logger.log(`deleteCypressTestUsers - Successfully deleted ${deletedUsers.length} users`);
    return deletedUsers;
  }

  public async getUsers(
    filters: {
      email?: string;
      partnerAccess?: { userId: string; featureTherapy: boolean; active: boolean };
      partnerAdmin?: { partnerAdminId: string };
    },
    relations: {
      partner?: boolean;
      partnerAccess?: boolean;
      partnerAdmin?: boolean;
      courseUser?: boolean;
      subscriptionUser?: boolean;
      therapySession?: boolean;
      eventLog?: boolean;
    },
    fields: Array<string>,
    limit: number,
  ): Promise<GetUserDto[] | undefined> {
    const users = await this.userRepository.find({
      relations: relations,
      where: {
        ...(filters.email && { email: ILike(`%${filters.email}%`) }),
        ...(filters.partnerAccess && {
          partnerAccess: {
            ...(filters.partnerAccess.userId && { userId: filters.partnerAccess.userId }),
            ...(typeof filters.partnerAccess.featureTherapy !== 'undefined' && {
              featureTherapy: filters.partnerAccess.featureTherapy,
            }),
            ...(typeof filters.partnerAccess.active !== 'undefined' && {
              active: filters.partnerAccess.active,
            }),
          },
        }),
        ...(filters.partnerAdmin && {
          partnerAdmin: {
            ...(filters.partnerAdmin && { id: filters.partnerAdmin.partnerAdminId }),
          },
        }),
      },
      ...(limit && { take: limit }),
    });

    const formattedUsers = users.map((user) => formatGetUsersObject(user));
    return formattedUsers;
  }
}
