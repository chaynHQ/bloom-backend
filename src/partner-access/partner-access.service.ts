import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist/common';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { CreateAccessCodeDto } from './dto/create-access-code.dto';
import { PartnerAccessRepository } from './partner-access.repository';
import _ from 'lodash';
import { IPartnerAccess } from './partner-access.model';

@Injectable()
export class PartnerAccessService {
  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
    @InjectRepository(PartnerRepository)
    private partnerRepository: PartnerRepository,
    @InjectRepository(PartnerAdminRepository)
    private partnerAdminRepository: PartnerAdminRepository,
  ) {}

  private async accessCodeCheck(accessCode: string): Promise<boolean> {
    const codeExists = await this.partnerAccessRepository.findOne({ accessCode });
    return !!codeExists;
  }

  private async generateAccessCode(length: number): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890';
    const accessCode = _.sampleSize(chars, length || 6).join('');
    if (await this.accessCodeCheck(accessCode)) {
      this.generateAccessCode(6);
    }
    return accessCode;
  }

  async createPartnerAccessCode(createAccessCodeDto: CreateAccessCodeDto): Promise<IPartnerAccess> {
    const {
      featureLiveChat,
      featureTherapy,
      therapySessionsRedeemed,
      therapySessionsRemaining,
      partnerId,
      partnerAdminId,
    } = createAccessCodeDto;

    const partner = await this.partnerRepository.findOne({
      id: partnerId,
    });

    const createdBy = await this.partnerAdminRepository.findOne({
      id: partnerAdminId,
    });

    const accessCodeDetails = this.partnerAccessRepository.create({
      partner,
      createdBy,
      featureLiveChat,
      featureTherapy,
      accessCode: await this.generateAccessCode(6),
      therapySessionsRedeemed,
      therapySessionsRemaining,
    });

    const accessCodeReponse = await this.partnerAccessRepository.save(accessCodeDetails);
    return {
      id: accessCodeReponse.id,
      createdBy: {
        id: accessCodeReponse.createdBy.id,
        name: accessCodeReponse.createdBy.user.name,
        email: accessCodeReponse.createdBy.user.email,
      },
      partner: {
        id: accessCodeReponse.partner.id,
        name: accessCodeReponse.partner.name,
        logo: accessCodeReponse.partner.logo,
        primaryColour: accessCodeReponse.partner.primaryColour,
      },
      accessCode: accessCodeReponse.accessCode,
      featureLiveChat,
      featureTherapy,
      therapySessionsRemaining,
      therapySessionsRedeemed,
    };
  }
}
