import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class UpdatePartnerDto {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean, required: false })
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  @ApiProperty({ type: Number, required: false, minimum: 0, maximum: 20 })
  therapySessionsPerCode?: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ type: Boolean, required: false })
  automaticAccessCode?: boolean;

  // null clears it
  @IsOptional()
  @IsUUID()
  @ApiProperty({ type: String, format: 'uuid', required: false, nullable: true })
  parentId?: string | null;
}
