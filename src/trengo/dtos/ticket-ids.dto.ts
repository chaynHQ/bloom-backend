import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNumber } from 'class-validator';

export class TicketIdsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMaxSize(1000, { message: 'Too many ticket IDs' })
  @ApiProperty({
    type: [Number],
    description: 'Array of Trengo ticket IDs',
    example: [1001, 1002],
  })
  ticketIds: number[];
}
