import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  deleteCypressMailchimpProfiles,
  deleteMailchimpProfile,
} from 'src/api/mailchimp/mailchimp-api';
import { CrispService } from 'src/crisp/crisp.service';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { Logger } from 'src/logger/logger';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { SIGNUP_TYPE } from 'src/utils/constants';
import { FIREBASE_ERRORS } from 'src/utils/errors';
import { FIREBASE_EVENTS, USER_SERVICE_EVENTS } from 'src/utils/logs';
import { ILike, IsNull, Not, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { basePartnerAccess, PartnerAccessService } from '../partner-access/partner-access.service';
import { formatUserObject } from '../utils/serialize';
import { generateRandomString } from '../utils/utils';
import { AdminUpdateUserDto } from './dtos/admin-update-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { GetUserDto } from './dtos/get-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(PartnerAccessEntity)
    private partnerAccessRepository: Repository<PartnerAccessEntity>,
    @InjectRepository(PartnerEntity)
    private partnerRepository: Repository<PartnerEntity>,
    private readonly authService: AuthService,
    private readonly subscriptionUserService: SubscriptionUserService,
    private readonly therapySessionService: TherapySessionService,
    private readonly partnerAccessService: PartnerAccessService,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
    private readonly crispService: CrispService,
  ) {}

  public async createUser(createUserDto: CreateUserDto): Promise<GetUserDto> {
    const { email, partnerAccessCode, partnerId, password } = createUserDto;

    const signUpType = partnerAccessCode
      ? SIGNUP_TYPE.PARTNER_USER_WITH_CODE
      : partnerId
        ? SIGNUP_TYPE.PARTNER_USER_WITHOUT_CODE
        : SIGNUP_TYPE.PUBLIC_USER;

    try {
      let partnerAccess: PartnerAccessEntity;
      let partner: PartnerEntity;

      if (signUpType === SIGNUP_TYPE.PARTNER_USER_WITHOUT_CODE) {
        await this.partnerAccessService.validatePartnerAutomaticAccessCode(partnerId);
        partner = await this.partnerRepository.findOneBy({ id: partnerId });
      }
      if (signUpType === SIGNUP_TYPE.PARTNER_USER_WITH_CODE) {
        partnerAccess = await this.partnerAccessService.getPartnerAccessByCode(partnerAccessCode);
        partner = partnerAccess.partner;
      }

      const firebaseUser = await this.authService.createFirebaseUser(email, password);

      const user = await this.userRepository.save({
        ...createUserDto,
        lastActiveAt: new Date(),
        firebaseUid: firebaseUser.uid,
      });

      if (signUpType === SIGNUP_TYPE.PARTNER_USER_WITHOUT_CODE) {
        // Create and assign new partner access without code
        partnerAccess = await this.partnerAccessService.createPartnerAccess(
          basePartnerAccess,
          partnerId,
          null,
          user.id,
        );

        this.logger.log(`Create user: (no access code) created partner user in db. User: ${email}`);
      } else if (signUpType === SIGNUP_TYPE.PARTNER_USER_WITH_CODE) {
        // Assign the existing partner access to new user
        partnerAccess.userId = user.id;
        partnerAccess = await this.partnerAccessRepository.save(partnerAccess);
        this.logger.log(
          `Create user: (with access code) created partner user in db. User: ${email}`,
        );
      } else {
        this.logger.log(`Create user: created public user in db. User: ${email}`);
      }

      await this.serviceUserProfilesService.createServiceUserProfiles(user, partner, partnerAccess);

      const userDto = formatUserObject({
        ...user,
        ...(partnerAccess && { partnerAccess: [{ ...partnerAccess, partner }] }),
      });
      return userDto;
    } catch (error) {
      if (!Object.values(FIREBASE_ERRORS).includes(error)) {
        this.logger.error(`Create user: Error creating user ${email}: ${error}`);
      }
      throw error;
    }
  }

  public async getUserByFirebaseId({ uid }: IFirebaseUser): Promise<{
    userEntity: UserEntity | undefined;
    userDto: GetUserDto | undefined;
  }> {
    const queryResult = await this.userRepository.findOneBy({
      firebaseUid: uid,
    });

    if (!queryResult) {
      throw new HttpException('USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    return { userEntity: queryResult, userDto: formatUserObject(queryResult) };
  }

  public async getUserProfile(id: string): Promise<{
    userEntity: UserEntity | undefined;
    userDto: GetUserDto | undefined;
  }> {
    const queryResult = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.partnerAccess', 'partnerAccess')
      .leftJoinAndSelect('user.partnerAdmin', 'partnerAdmin')
      .leftJoinAndSelect('partnerAccess.partner', 'partner')
      .leftJoinAndSelect('partnerAccess.partner', 'partnerAccessPartner')
      .leftJoinAndSelect('partnerAdmin.partner', 'partnerAdminPartner')
      .leftJoinAndSelect('user.resourceUser', 'resourceUser')
      .leftJoinAndSelect('resourceUser.resource', 'resource')
      .leftJoinAndSelect('user.subscriptionUser', 'subscriptionUser')
      .leftJoinAndSelect('subscriptionUser.subscription', 'subscription')
      .where('user.id = :id', { id })
      .getOne();

    if (!queryResult) {
      throw new HttpException('USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    return { userEntity: queryResult, userDto: formatUserObject(queryResult) };
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
      await this.authService.deleteFirebaseUser(user.firebaseUid);
      this.logger.log(`Firebase account deleted for user with ID ${user.id}`);
    } catch (err) {
      // Continue to delete user, even if firebase request fails
      this.logger.error(
        `deleteUser - firebase error. Unable to delete user ${user.email} due to error ${err}`,
      );
    }

    try {
      // If they have subscriptions,redact the number
      await this.subscriptionUserService.softDeleteSubscriptionsForUser(user.id, user.email);
      // If they have therapy sessions redact email and delete client from therapy sessions
      await this.therapySessionService.softDeleteTherapySessions(user.id, user.email, randomString);

      // Randomise User Data in DB
      const updateUser = {
        ...user,
        firebaseUid: randomString,
        name: randomString,
        email: randomString,
        isActive: false,
        deletedAt: new Date(),
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

  public async updateUser(updateUserDto: Partial<UpdateUserDto>, userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new HttpException('USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    if (updateUserDto.email && user.email !== updateUserDto.email) {
      // check whether email has been updated already in firebase
      const firebaseUser = await this.authService.getFirebaseUser(user.email);
      if (firebaseUser.email !== updateUserDto.email) {
        await this.authService.updateFirebaseUserEmail(user.firebaseUid, updateUserDto.email);
        this.logger.log({ event: FIREBASE_EVENTS.UPDATE_FIREBASE_USER_EMAIL, userId: user.id });
      } else {
        this.logger.log({
          event: FIREBASE_EVENTS.UPDATE_FIREBASE_EMAIL_ALREADY_UPDATED,
          userId: user.id,
        });
      }
    }

    const newUserData: UserEntity = {
      ...user,
      ...updateUserDto,
    };
    const updatedUser = await this.userRepository.save(newUserData);
    this.logger.log({
      event: USER_SERVICE_EVENTS.USER_UPDATED,
      userId: user.id,
      fields: Object.keys(updateUserDto),
    });

    const isEmailUpdateRequired = updateUserDto.email && user.email !== updateUserDto.email;

    if (
      Object.keys(updateUserDto).length === 1 &&
      !!updateUserDto.lastActiveAt &&
      !!user.lastActiveAt &&
      updateUserDto.lastActiveAt.getDate() === user.lastActiveAt.getDate()
    ) {
      // Do nothing, prevent unnecessay updates to service profiles when last active date is same date
    } else {
      const isCrispBaseUpdateRequired =
        isEmailUpdateRequired ||
        user.signUpLanguage !== updateUserDto.signUpLanguage ||
        user.name !== updateUserDto.name;
      this.serviceUserProfilesService.updateServiceUserProfilesUser(
        newUserData,
        isCrispBaseUpdateRequired,
        isEmailUpdateRequired,
        user.email,
      );
    }

    return updatedUser;
  }

  public async adminUpdateUser(updateUserDto: Partial<AdminUpdateUserDto>, userId: string) {
    const { isSuperAdmin, ...updateUserDtoWithoutSuperAdmin } = updateUserDto;

    await this.updateUser(updateUserDtoWithoutSuperAdmin, userId);

    if (typeof isSuperAdmin !== 'undefined') {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (user.isSuperAdmin !== isSuperAdmin) {
        const updatedUser = await this.userRepository.save({
          ...user,
          isSuperAdmin,
        });
        this.logger.log({
          event: USER_SERVICE_EVENTS.USER_UPDATED,
          userId: user.id,
          fields: ['isSuperAdmin'],
        });
        return updatedUser;
      }
    }
  }

  // Function to hard delete users in batches, required to clean up e.g. cypress test accounts
  // Deleted users in batches of 10 per 1 second, due to firebase rate limiting
  public async batchDeleteUsers(users) {
    const BATCH_SIZE = 10; // Users to delete per second
    const INTERVAL = 100; // Interval between batches in milliseconds

    const deletedUsers: UserEntity[] = [];
    let startIndex = 0;

    while (startIndex < users.length) {
      const batch = users.slice(startIndex, startIndex + BATCH_SIZE);
      await Promise.all(
        batch.map(async (user) => {
          try {
            await this.crispService.deleteCrispProfile(user.email);
          } catch (error) {
            this.logger.warn(
              `deleteCypressTestUsers - unable to delete crisp profile for user ${user.id}`,
              error,
            );
          }
          try {
            await deleteMailchimpProfile(user.email);
          } catch (error) {
            this.logger.warn(
              `deleteCypressTestUsers - unable to delete mailchimp profile for user ${user.id}`,
              error,
            );
          }
          try {
            await this.authService.deleteFirebaseUser(user.firebaseUid);
          } catch (error) {
            this.logger.warn(
              `deleteCypressTestUsers - unable to delete firebase profile for user ${user.id}`,
              error,
            );
          }
          try {
            await this.userRepository.delete(user.id);
            deletedUsers.push(user);
          } catch (error) {
            this.logger.error(
              `deleteCypressTestUsers - Unable to delete db record for user ${user.id}`,
              error,
            );
          }
        }),
      );
      startIndex += BATCH_SIZE;
      await new Promise((resolve) => setTimeout(resolve, INTERVAL)); // Wait before processing next batch
    }

    this.logger.log(`deleteCypressTestUsers - successfully deleted ${deletedUsers.length} users`);
    return deletedUsers;
  }

  public async deleteCypressTestUsers(clean = false): Promise<UserEntity[]> {
    let deletedUsers: UserEntity[];
    try {
      const users = await this.userRepository.find({
        where: {
          email: ILike('%cypresstestemail+%'),
        },
      });

      deletedUsers = await this.batchDeleteUsers(users);
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
        await deleteCypressMailchimpProfiles();

        // Delete all remaining crisp accounts
        await this.crispService.deleteCypressCrispProfiles();
      }
    } catch (error) {
      // If this fails we don't want to break cypress tests but we want to be alerted
      this.logger.error(`deleteCypressTestUsers - Unable to clean all cypress users`, error);
    }

    return deletedUsers;
  }

  public async getUsers(
    filters: {
      email?: string;
      partnerAccess?: { userId: string; featureTherapy: boolean; active: boolean };
      partnerAdmin?: { partnerAdminId: string };
    },
    relations: string[],
    limit: number,
  ): Promise<UserEntity[] | undefined> {
    const users = await this.userRepository.find({
      relations,
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
            ...(filters.partnerAdmin && {
              id:
                filters.partnerAdmin.partnerAdminId === 'IS NOT NULL'
                  ? Not(IsNull())
                  : filters.partnerAdmin.partnerAdminId,
            }),
          },
        }),
      },
      ...(limit && { take: limit }),
    });
    return users;
  }
}
