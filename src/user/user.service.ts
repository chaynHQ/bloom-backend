import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
import { UserRepository } from './user.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { formatUserObject, getCrispUserData } from '../utils/serialize';
import { GetUserDto } from './dtos/get-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserEntity } from '../entities/user.entity';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerEntity } from '../entities/partner.entity';
import { PartnerRepository } from '../partner/partner.repository';
import { addCrispProfile, updateCrispProfile } from '../api/crisp/api-crisp';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    @InjectRepository(PartnerRepository)
    private partnerRepository: PartnerRepository,
    private readonly partnerAccessService: PartnerAccessService,
  ) {}

  public async createUser(
    createUserDto: CreateUserDto,
  ): Promise<
    | { user: UserEntity; partnerAccess: PartnerAccessEntity; partner: PartnerEntity }
    | { user: UserEntity }
  > {
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
          const {
            data: { data },
          } = await addCrispProfile({
            email: createUserResponse.email,
            person: { nickname: createUserResponse.name },
          });

          const userData = getCrispUserData(
            createUserResponse,
            getPartnerResponse,
            updatePartnerAccessResponse,
          );
          await updateCrispProfile({ ...userData }, data?.people_id);
        }

        delete updatePartnerAccessResponse.partnerAdmin;

        return {
          user: createUserResponse,
          partnerAccess: updatePartnerAccessResponse,
          partner: getPartnerResponse,
        };
      }

      return {
        user: createUserResponse,
      };
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
      .where('user.firebaseUid = :uid', { uid })
      .getOne();

    if (!queryResult) {
      throw new HttpException('NOT FOUND', HttpStatus.NOT_FOUND);
    }

    if (!!queryResult.partnerAdmin) {
      const partnerQueryResult = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.partnerAdmin', 'partnerAdmin')
        .leftJoinAndSelect('partnerAdmin.partner', 'partner')
        .where('user.firebaseUid = :uid', { uid })
        .getOne();

      Object.assign(queryResult.partnerAdmin, { partner: partnerQueryResult.partnerAdmin.partner });
    }

    return formatUserObject(queryResult);
  }
}
