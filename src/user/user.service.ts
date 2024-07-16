import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { batchCreateMailchimpProfiles } from 'src/api/mailchimp/mailchimp-api';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { Logger } from 'src/logger/logger';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { SIGNUP_TYPE } from 'src/utils/constants';
import { FIREBASE_ERRORS } from 'src/utils/errors';
import { FIREBASE_EVENTS, USER_SERVICE_EVENTS } from 'src/utils/logs';
import {
  createServiceUserProfiles,
  updateServiceUserEmailAndProfiles,
  updateServiceUserProfilesUser,
} from 'src/utils/serviceUserProfiles';
import { And, ILike, IsNull, Not, Raw, Repository } from 'typeorm';
import { deleteCypressCrispProfiles } from '../api/crisp/crisp-api';
import { AuthService } from '../auth/auth.service';
import { PartnerAccessService, basePartnerAccess } from '../partner-access/partner-access.service';
import { formatUserObject } from '../utils/serialize';
import { generateRandomString } from '../utils/utils';
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

      await createServiceUserProfiles(user, partner, partnerAccess);

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

    if (updateUserDto.email && user.email !== updateUserDto.email) {
      updateServiceUserEmailAndProfiles(newUserData, user.email);
    } else {
      const isCrispBaseUpdateRequired =
        user.signUpLanguage !== updateUserDto.signUpLanguage && user.name !== updateUserDto.name;
      updateServiceUserProfilesUser(newUserData, isCrispBaseUpdateRequired, user.email);
    }

    return updatedUser;
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
    relations: string[],
    fields: Array<string>,
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

  // Static bulk upload function to be used in specific cases
  // UPDATE THE FILTERS to the current requirements
  public async bulkUploadMailchimpProfiles() {
    try {
      const filterStartDate = '2023-01-01'; // UPDATE
      const filterEndDate = '2024-01-01'; // UPDATE
      const users = await this.userRepository.find({
        where: {
          // UPDATE TO ANY FILTERS
          createdAt: And(
            Raw((alias) => `${alias} >= :filterStartDate`, { filterStartDate: filterStartDate }),
            Raw((alias) => `${alias} < :filterEndDate`, { filterEndDate: filterEndDate }),
          ),
        },
        relations: {
          partnerAccess: { partner: true, therapySession: true },
          courseUser: { course: true, sessionUser: { session: true } },
        },
      });
      const usersWithCourseUsers = users.filter((user) => user.courseUser.length > 0);

      await batchCreateMailchimpProfiles(usersWithCourseUsers);
      this.logger.log(
        `Created batch mailchimp profiles for ${usersWithCourseUsers.length} users, created before ${filterStartDate}`,
      );
    } catch (error) {
      throw new Error(`Bulk upload mailchimp profiles API call failed: ${error}`);
    }
  }
}
