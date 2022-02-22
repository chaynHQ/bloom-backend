import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { addCrispProfile } from '../api/crisp/crisp-api';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerRepository } from '../partner/partner.repository';
import { crispProfileDataObject, formatUserObject } from '../utils/serialize';
import { CreateUserDto } from './dtos/create-user.dto';
import { GetUserDto } from './dtos/get-user.dto';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    @InjectRepository(PartnerRepository)
    private partnerRepository: PartnerRepository,
    private readonly partnerAccessService: PartnerAccessService,
  ) {}

  public async createUser(createUserDto: CreateUserDto): Promise<GetUserDto> {
    const { name, email, firebaseUid, languageDefault, partnerAccessCode, contactPermission } =
      createUserDto;
    const createUserObject = this.userRepository.create({
      name,
      email,
      languageDefault,
      firebaseUid,
      contactPermission,
    });

    try {
      const createUserResponse = await this.userRepository.save(createUserObject);
      if (partnerAccessCode) {
        const updatePartnerAccessResponse =
          await this.partnerAccessService.updatePartnerAccessCodeUser(
            partnerAccessCode,
            createUserResponse.id,
          );

        const getPartnerResponse = await this.partnerRepository.findOne({
          id: updatePartnerAccessResponse.partnerId,
        });

        if (!!updatePartnerAccessResponse.featureLiveChat) {
          addCrispProfile({
            email: createUserResponse.email,
            person: { nickname: createUserResponse.name },
            data: crispProfileDataObject(
              createUserResponse,
              getPartnerResponse,
              updatePartnerAccessResponse,
            ),
          });
        }
        updatePartnerAccessResponse.partner = getPartnerResponse;
        createUserResponse.partnerAccess = [updatePartnerAccessResponse];
        return formatUserObject(createUserResponse);
      }
      return formatUserObject(createUserResponse);
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
}
