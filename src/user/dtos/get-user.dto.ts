import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IResource } from 'src/resource/resource.interface';
import { ITherapySession } from 'src/webhooks/webhooks.interface';
import { IPartnerAccessWithPartner } from '../../partner-access/partner-access.interface';
import { IPartnerAdminWithPartner } from '../../partner-admin/partner-admin.interface';
import { UserProfileDto } from './user-profile.dto';

export class GetUserDto {
  @ApiProperty({ description: 'The user profile', type: () => UserProfileDto })
  user: UserProfileDto;

  @ApiPropertyOptional({ description: 'Partner accesses with partner details' })
  partnerAccesses?: IPartnerAccessWithPartner[];

  @ApiPropertyOptional({ description: 'Partner admin with partner details' })
  partnerAdmin?: IPartnerAdminWithPartner;

  @ApiPropertyOptional({ description: 'User resources' })
  resources?: IResource[];

  @ApiPropertyOptional({ description: 'User therapy sessions' })
  therapySessions?: ITherapySession[];
}
