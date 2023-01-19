import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createCrispProfileData } from 'src/api/crisp/utils/createCrispProfileData';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import {
  addCrispProfile,
  deleteCrispProfile,
  updateCrispProfileData,
} from '../api/crisp/crisp-api';
import { AuthService } from '../auth/auth.service';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { formatUserObject } from '../utils/serialize';
import { generateRandomString } from '../utils/utils';
import { CreateUserDto } from './dtos/create-user.dto';
import { GetUserDto } from './dtos/get-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    private readonly partnerAccessService: PartnerAccessService,
    private readonly authService: AuthService,
  ) {}

  public async createUser(createUserDto: CreateUserDto): Promise<GetUserDto> {
    const {
      name,
      email,
      firebaseUid,
      partnerAccessCode,
      contactPermission,
      signUpLanguage,
      partnerId,
    } = createUserDto;
    const createUserObject = this.userRepository.create({
      name,
      email,
      firebaseUid,
      contactPermission,
      signUpLanguage,
    });

    try {
      const createUserResponse = await this.userRepository.save(createUserObject);
      // Only assign Partner access code if partner access or partner id is supplied
      const partnerAccessWithPartner = partnerAccessCode
        ? await this.partnerAccessService.assignPartnerAccessOnSignup({
            partnerAccessCode,
            userId: createUserResponse.id,
          })
        : partnerId
        ? await this.partnerAccessService.assignPartnerAccessOnSignupWithoutCode({
            partnerId,
            userId: createUserResponse.id,
          })
        : undefined;

      // partner segment is for crisp API
      const partnerSegment = partnerAccessWithPartner
        ? partnerAccessWithPartner.partner.name
        : 'public';

      await addCrispProfile({
        email: createUserResponse.email,
        person: { nickname: createUserResponse.name },
        segments: [partnerSegment.toLowerCase()],
      });

      await updateCrispProfileData(
        createCrispProfileData(
          createUserResponse,
          partnerAccessWithPartner ? [partnerAccessWithPartner] : [],
        ),
        createUserResponse.email,
      );

      return partnerAccessWithPartner
        ? formatUserObject({
            ...createUserResponse,
            ...(partnerAccessWithPartner ? { partnerAccess: [partnerAccessWithPartner] } : {}),
          })
        : { user: createUserResponse };
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  public async getUser({ uid }: IFirebaseUser): Promise<GetUserDto | undefined> {
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
      .where('user.firebaseUid = :uid', { uid })
      .getOne();

    if (!queryResult) {
      throw new HttpException('USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    return formatUserObject(queryResult);
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
}
