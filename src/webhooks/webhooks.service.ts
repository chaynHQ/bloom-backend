import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SimplybookBodyDto } from '../partner-access/dtos/zapier-body.dto';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { UserRepository } from '../user/user.repository';
import { SIMPLYBOOK_ACTION_ENUM } from '../utils/constants';
import apiCall from '../api/apiCalls';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(PartnerAccessRepository)
    private partnerAccessRepository: PartnerAccessRepository,
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
  ) {}
  async updatePartnerAccessBooking({ action, client_email }: SimplybookBodyDto): Promise<string> {
    const userDetails = await this.userRepository.findOne({ email: client_email });

    if (!userDetails) {
      await apiCall({
        url: process.env.SLACK_WEBHOOK_URL,
        type: 'post',
        data: {
          text: `Unknown email address made a therapy booking - ${client_email} 🚨`,
        },
      });
      throw new HttpException('Unable to find user', HttpStatus.BAD_REQUEST);
    }

    const partnerAccessDetails = await this.partnerAccessRepository.findOne({
      userId: userDetails.id,
    });

    if (!partnerAccessDetails) {
      throw new HttpException('Unable to find partner access code', HttpStatus.BAD_REQUEST);
    }

    let partnerAccessUpdateDetails = {};

    if (action === SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING) {
      if (Number(partnerAccessDetails.therapySessionsRemaining) === 0) {
        throw new HttpException('No therapy sessions remaining', HttpStatus.FORBIDDEN);
      }

      partnerAccessUpdateDetails = {
        therapySessionsRemaining: Number(partnerAccessDetails.therapySessionsRemaining) - 1,
        therapySessionsRedeemed: Number(partnerAccessDetails.therapySessionsRedeemed) + 1,
      };
    }

    if (action === SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) {
      partnerAccessUpdateDetails = {
        therapySessionsRemaining: Number(partnerAccessDetails.therapySessionsRemaining) + 1,
        therapySessionsRedeemed: Number(partnerAccessDetails.therapySessionsRedeemed) - 1,
      };
    }

    try {
      await this.partnerAccessRepository.save({
        ...partnerAccessDetails,
        ...partnerAccessUpdateDetails,
      });

      return 'Successful';
    } catch (error) {
      return error;
    }
  }
}
