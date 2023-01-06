import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { FIREBASE } from '../firebase/firebase-factory';
import { FirebaseServices } from '../firebase/firebase.types';
import { PartnerService } from '../partner/partner.service';
import { UserRepository } from '../user/user.repository';
import { generateRandomString } from '../utils/utils';
import { CreatePartnerAdminUserDto } from './dtos/create-partner-admin-user.dto';
import { CreatePartnerAdminDto } from './dtos/create-partner-admin.dto';
import { PartnerAdminRepository } from './partner-admin.repository';

@Injectable()
export class PartnerAdminService {
  constructor(
    @InjectRepository(PartnerAdminRepository)
    private partnerAdminRepository: PartnerAdminRepository,
    private readonly partnerService: PartnerService,
    @Inject(FIREBASE) private firebase: FirebaseServices,
    @InjectRepository(UserRepository) private userRepository: UserRepository,
  ) {}

  async createPartnerAdmin(
    createPartnerAdminDto: CreatePartnerAdminDto,
  ): Promise<PartnerAdminEntity | unknown> {
    try {
      const createPartnerAdminObject = this.partnerAdminRepository.create(createPartnerAdminDto);
      return await this.partnerAdminRepository.save(createPartnerAdminObject);
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpException(error.detail, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  async createPartnerAdminUser({
    email,
    partnerId,
    name,
  }: CreatePartnerAdminUserDto): Promise<PartnerAdminEntity | unknown> {
    try {
      const partnerResponse = await this.partnerService.getPartnerById(partnerId);

      if (!partnerResponse) {
        throw new HttpException('Partner does not exist', HttpStatus.BAD_REQUEST);
      }

      const firebaseUser = await this.firebase.auth.createUserWithEmailAndPassword(
        email,
        generateRandomString(10),
      );

      const user = await this.userRepository.save({
        name,
        email,
        firebaseUid: firebaseUser.user.uid,
        contactPermission: true,
      });

      return await this.partnerAdminRepository.save({
        userId: user.id,
        partnerId: partnerResponse.id,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        throw new HttpException('This email address is already in use', HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
}
