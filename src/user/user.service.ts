import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createCrispProfileData } from 'src/api/crisp/utils/createCrispProfileData';
import { UserEntity } from 'src/entities/user.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { Logger } from 'src/logger/logger';
import { PartnerService } from 'src/partner/partner.service';
import { FEATURES } from 'src/utils/constants';
import {
  CREATE_USER_EMAIL_ALREADY_EXISTS,
  CREATE_USER_INVALID_EMAIL,
  CREATE_USER_WEAK_PASSWORD,
} from 'src/utils/errors';
import {
  addCrispProfile,
  deleteCrispProfile,
  updateCrispProfileData,
} from '../api/crisp/crisp-api';
import { AuthService } from '../auth/auth.service';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { formatGetUsersObject, formatUserObject } from '../utils/serialize';
import { generateRandomString } from '../utils/utils';
import { CreateUserDto } from './dtos/create-user.dto';
import { GetUserDto } from './dtos/get-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserRepository } from './user.repository';

enum SIGNUP_TYPE {
  PUBLIC_USER = 'PUBLIC_USER',
  PARTNER_USER_WITH_CODE = 'PARTNER_USER_WITH_CODE',
  PARTNER_USER_WITHOUT_CODE = 'PARTNER_USER_WITHOUT_CODE',
}

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    private readonly partnerAccessService: PartnerAccessService,
    private readonly partnerService: PartnerService,
    private readonly authService: AuthService,
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
        this.logger.warn(
          `Create user: Unable to create firebase user as user already exists: ${email}`,
        );
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
      const userAlreadyExists = (err) =>
        err.message.includes('already exists') ||
        err.message.includes('UQ_e12875dfb3b1d92d7d7c5377e22') ||
        err.message.includes(
          'duplicate key value violates unique constraint "UQ_905432b2c46bdcfe1a0dd3cdeff"',
        );
      if (userAlreadyExists(error)) {
        this.logger.warn(`Create user: User already exists ${email}`);
        throw new HttpException(CREATE_USER_EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT);
      }
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.CONFLICT);
      }
      this.logger.error(`Create user: Error creating user ${email}: ${error}`);
      throw error;
    }
  }

  public async createPublicUser(
    { name, email, contactPermission, signUpLanguage }: CreateUserDto,
    firebaseUid: string,
  ) {
    try {
      const createUserObject = this.userRepository.create({
        name,
        email,
        firebaseUid,
        contactPermission,
        signUpLanguage,
      });
      const createUserResponse = await this.userRepository.save(createUserObject);

      return { user: createUserResponse };
    } catch (error) {
      throw error;
    }
  }

  public async createPartnerUserWithoutCode(
    { name, email, contactPermission, signUpLanguage, partnerId }: CreateUserDto,
    firebaseUid: string,
  ) {
    try {
      const partnerResponse = await this.partnerService.getPartnerWithPartnerFeaturesById(
        partnerId,
      );
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
    } catch (error) {
      throw error;
    }
  }

  public async createPartnerUserWithCode(
    { name, email, contactPermission, signUpLanguage, partnerAccessCode }: CreateUserDto,
    firebaseUid: string,
  ) {
    try {
      const partnerAccess = await this.partnerAccessService.getValidPartnerAccessCode(
        partnerAccessCode,
      );

      const createUserObject = this.userRepository.create({
        name,
        email,
        firebaseUid,
        contactPermission,
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
    } catch (error) {
      throw error;
    }
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

  public async deleteUser({ user, partnerAdmin }: GetUserDto) {
    //Delete User From Firebase
    await this.authService.deleteFirebaseUser(user.firebaseUid);

    //Delete Crisp People Profile
    if (!partnerAdmin) {
      await deleteCrispProfile(user.email);
    }

    //Randomise User Data in DB
    const randomString = generateRandomString(20);

    user.name = randomString;
    user.email = randomString;
    user.firebaseUid = randomString;
    user.isActive = false;

    await this.userRepository.save(user);

    return 'Successful';
  }

  public async deleteUserById(id: string): Promise<UserEntity> {
    //Delete User From Firebase
    try {
      const user = await this.getUserById(id);
      await this.authService.deleteFirebaseUser(user.firebaseUid);
      //Delete Crisp People Profile
      await deleteCrispProfile(user.email);

      //Randomise User Data in DB
      const randomString = generateRandomString(20);
      const newUser = {
        ...user,
        name: randomString,
        email: `${randomString}@deletedemail.com`,
        firebaseUid: randomString,
        isActive: false,
      };

      await this.userRepository.save(newUser);

      return newUser;
    } catch (error) {
      throw error;
    }
  }

  public async updateUser(updateUserDto: UpdateUserDto, { user: { id } }: GetUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new HttpException('USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    user.name = updateUserDto?.name ?? user.name;
    user.contactPermission = updateUserDto?.contactPermission ?? user.contactPermission;

    await this.userRepository.save(user);

    return user;
  }
  public async deleteCypressTestUsers(): Promise<UserEntity[]> {
    try {
      const queryResult = await this.userRepository
        .createQueryBuilder('user')
        .select()
        .where('user.name LIKE :searchTerm', { searchTerm: `%Cypress test user%` })
        .getMany();

      const deletedUsers = await Promise.all(
        queryResult.map(async (user) => {
          try {
            await this.authService.deleteFirebaseUser(user.firebaseUid);
            await this.userRepository.delete(user.id);
            return user;
          } catch (error) {
            this.logger.error(`Unable to delete cypress user: ${user.email} ${error}`);
            this.logger.error(
              `deleteCypressTestAccessCodes - Unable to delete cypress user: ${user.email} ${error}`,
            );
          }
        }),
      );
      return deletedUsers;
    } catch (error) {
      // If this fails we don't want to break cypress tests
      this.logger.error(`deleteCypressTestAccessCodes - Unable to delete all cypress users`, error);
    }
  }
  public async getUsers(
    filters: {
      email?: string;
      partnerAccess?: { userId: string; featureTherapy: boolean; active: boolean };
      partnerAdmin?: { partnerAdminId: string };
    },
    relations: Array<string>,
    fields: Array<string>,
    limit: number,
  ): Promise<GetUserDto[] | undefined> {
    const query = this.userRepository.createQueryBuilder('user');
    // TODO this needs some refactoring but deprioritised for now
    if (relations.indexOf('partnerAccess') >= 0) {
      query.leftJoinAndSelect('user.partnerAccess', 'partnerAccess');
    }

    if (relations?.indexOf('partner-admin') >= 0) {
      query.leftJoinAndSelect('user.partnerAdmin', 'partnerAdmin');
    }

    if (filters?.partnerAdmin?.partnerAdminId === 'IS NOT NULL') {
      query.andWhere('partnerAdmin.partnerAdminId IS NOT NULL');
    }

    if (filters.partnerAccess?.userId === 'IS NOT NULL') {
      query.andWhere('partnerAccess.userId IS NOT NULL');
    }

    if (filters.partnerAccess?.featureTherapy) {
      query.andWhere('partnerAccess.featureTherapy = :featureTherapy', {
        featureTherapy: filters.partnerAccess.featureTherapy,
      });
    }

    if (filters.partnerAccess?.active) {
      query.andWhere('partnerAccess.active = :active', {
        active: filters.partnerAccess.active,
      });
    }

    if (filters.email) {
      query.andWhere('user.email ILike :email', { email: `%${filters.email}%` });
    }

    if (limit) {
      query.limit(limit);
    }

    const queryResult = await query.getMany();
    const formattedUsers = queryResult.map((user) => formatGetUsersObject(user));
    return formattedUsers;
  }
}
