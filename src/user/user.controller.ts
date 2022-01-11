import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
import { UserService } from './user.service';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { GetUserDto } from './dtos/get-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserEntity } from '../entities/user.entity';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerEntity } from '../entities/partner.entity';
import { ControllerDecorator } from '../utils/controller.decorator';

@ApiTags('Users')
@ControllerDecorator()
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
