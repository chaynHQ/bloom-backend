import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateResourceUserDto {
  @IsNotEmpty()
  @IsString()
  resourceId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsOptional()
  @IsDate()
  completedAt?: Date;
}
