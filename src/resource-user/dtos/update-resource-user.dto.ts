import { IsDate, IsOptional } from 'class-validator';

export class UpdateResourceUserDto {
  @IsOptional()
  @IsDate()
  completedAt?: Date;
}
