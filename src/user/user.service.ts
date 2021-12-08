import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
import { UserRepository } from './user.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { formatUserObject } from '../utils/constants';
import { GetUserDto } from './dtos/get-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserEntity } from '../entities/user.entity';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerEntity } from '../entities/partner.entity';
import { PartnerRepository } from '../partner/partner.repository';

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

        const partnerDetails = await this.partnerRepository.findOne({
          id: updatePartnerAccessResponse.partnerId,
        });

        delete updatePartnerAccessResponse.partnerAdmin;

        return {
          user: createUserResponse,
          partnerAccess: updatePartnerAccessResponse,
          partner: partnerDetails,
        };
      }

      return {
        user: createUserResponse,
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.CONFLICT);
      }
      return error;
    }
  }

  public async getUser({ uid }: IFirebaseUser): Promise<GetUserDto | undefined> {
    const queryResult = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.partnerAccess', 'partnerAccess')
      .leftJoinAndSelect('user.partnerAdmin', 'partnerAdmin')
      .leftJoinAndSelect('partnerAdmin.partner', 'partner')
      .where('user.firebaseUid = :uid', { uid })
      .getOne();

    if (!queryResult) {
      throw new HttpException('NOT FOUND', HttpStatus.NOT_FOUND);
    }

    return formatUserObject(queryResult);
  }
}
