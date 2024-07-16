import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { FIREBASE } from '../firebase/firebase-factory';
import { FirebaseServices } from '../firebase/firebase.types';
import { PartnerService } from '../partner/partner.service';
import { generateRandomString } from '../utils/utils';
import { CreatePartnerAdminUserDto } from './dtos/create-partner-admin-user.dto';
import { CreatePartnerAdminDto } from './dtos/create-partner-admin.dto';
import { UpdatePartnerAdminDto } from './dtos/update-partner-admin.dto';

@Injectable()
export class PartnerAdminService {
  constructor(
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    @InjectRepository(PartnerAdminEntity)
    private partnerAdminRepository: Repository<PartnerAdminEntity>,
    private readonly partnerService: PartnerService,
    @Inject(FIREBASE) private firebase: FirebaseServices,
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
        serviceEmailsPermission: true,
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

  async updatePartnerAdminById(
    partnerAdminId: string,
    updatePartnerAdminDto: UpdatePartnerAdminDto,
  ): Promise<PartnerAdminEntity | unknown> {
    const partnerAdminResponse = await this.partnerAdminRepository.findOneBy({
      id: partnerAdminId,
    });

    if (!partnerAdminResponse) {
      throw new HttpException('Partner admin does not exist', HttpStatus.BAD_REQUEST);
    }
    const updatedPartnerAdminResponse = await this.partnerAdminRepository
      .createQueryBuilder('partner_admin')
      .update(PartnerAdminEntity)
      .set({ active: updatePartnerAdminDto.active })
      .where('partnerAdminId = :partnerAdminId', { partnerAdminId })
      .returning('*')
      .execute();

    if (updatedPartnerAdminResponse.raw.length > 0) {
      return updatedPartnerAdminResponse.raw[0];
    } else {
      throw new Error('Failed to update partner admin');
    }
  }
}
