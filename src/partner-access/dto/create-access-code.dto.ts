import { IsNotEmpty, IsBoolean, IsInt, IsUUID } from 'class-validator';

export class CreateAccessCodeDto {
  //IDs to be removed when AuthGuard is implemented
  @IsNotEmpty()
  @IsUUID()
  partnerId: string;
  @IsNotEmpty()
  @IsUUID()
  partnerAdminId: string;
  @IsNotEmpty()
  @IsBoolean()
  featureLiveChat: boolean;
  @IsNotEmpty()
  @IsBoolean()
  featureTherapy: boolean;
  @IsNotEmpty()
  @IsInt()
  therapySessionsRemaining: number;
  @IsNotEmpty()
  @IsInt()
  therapySessionsRedeemed: number;
}
