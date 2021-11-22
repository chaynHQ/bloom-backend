import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
import { UserService } from './user.service';
import { Request } from 'express';
import {
  ApiTags,
  ApiConsumes,
  ApiProduces,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { GetUserDto } from './dto/get-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';

@ApiTags('Users')
@ApiConsumes('application/json')
@ApiProduces('application/json')
@ApiResponse({ status: 201, description: 'The record has been successfully created.' })
@ApiResponse({ status: 400, description: 'Incorrect payload sent.' })
@ApiResponse({ status: 401, description: 'Unauthorized.' })
@ApiResponse({ status: 403, description: 'Forbidden.' })
@ApiResponse({ status: 500, description: 'Internal Server Error.' })
@Controller('/v1/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiBody({ type: CreateUserDto })
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<
    | { user: UserEntity; partnerAccess: PartnerAccessEntity; partner: PartnerEntity }
    | { user: UserEntity }
  > {
    return await this.userService.createUser(createUserDto);
  }

  @ApiBearerAuth()
  @Post('/me')
  @UseGuards(FirebaseAuthGuard)
  async getUser(@Req() req: Request): Promise<GetUserDto> {
    return this.userService.getUser(req['user'] as IFirebaseUser);
  }
}
