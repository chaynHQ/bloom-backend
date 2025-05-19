import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserEntity } from 'src/entities/user.entity';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { AdminUpdateUserDto } from './dtos/admin-update-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { GetUserDto } from './dtos/get-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@ControllerDecorator()
@Controller('/v1/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
  ) {}

  @Post()
  @ApiOperation({
    description: 'Stores basic profile data for a user',
  })
  @ApiBody({ type: CreateUserDto })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<GetUserDto> {
    return await this.userService.createUser(createUserDto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Returns user profile data with their nested partner access, partner admin, course user and session user data.',
  })
  @Get('/me')
  @UseGuards(FirebaseAuthGuard)
  async getUserByFirebaseId(@Req() req: Request): Promise<GetUserDto> {
    const user = req['userEntity'];
    this.userService.updateUser({ lastActiveAt: new Date() }, user.id);
    return (await this.userService.getUserProfile(user.id)).userDto;
  }

  @ApiBearerAuth()
  @Delete()
  @UseGuards(FirebaseAuthGuard)
  async deleteUser(@Req() req: Request): Promise<UserEntity> {
    return await this.userService.deleteUser(req['userEntity']);
  }

  // This route must go before the Delete user route below as we want nestjs to check against this one first
  @ApiBearerAuth('access-token')
  @Delete('/cypress')
  @UseGuards(SuperAdminAuthGuard)
  async deleteCypressUsers(): Promise<UserEntity[]> {
    return await this.userService.deleteCypressTestUsers();
  }

  @ApiBearerAuth('access-token')
  @Delete('/cypress-clean')
  @UseGuards(SuperAdminAuthGuard)
  async cleanCypressUsers(): Promise<UserEntity[]> {
    return await this.userService.deleteCypressTestUsers(true);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiParam({ name: 'id', description: 'User id to delete' })
  @UseGuards(SuperAdminAuthGuard)
  async adminDeleteUser(@Param() { id }): Promise<UserEntity> {
    return await this.userService.deleteUserById(id);
  }

  @ApiBearerAuth()
  @Patch()
  @UseGuards(FirebaseAuthGuard)
  async updateUser(@Body() updateUserDto: UpdateUserDto, @Req() req: Request): Promise<UserEntity> {
    return await this.userService.updateUser(updateUserDto, req['userEntity'].id);
  }

  @ApiBearerAuth()
  @Patch('/admin/:id')
  @UseGuards(SuperAdminAuthGuard)
  async adminUpdateUser(@Param() { id }, @Body() adminUpdateUserDto: AdminUpdateUserDto) {
    return await this.userService.adminUpdateUser(adminUpdateUserDto, id);
  }

  @ApiBearerAuth()
  @Get()
  @UseGuards(SuperAdminAuthGuard)
  async getUsers(@Query() query) {
    let searchQuery;
    try {
      searchQuery = query.searchCriteria ? JSON.parse(query.searchCriteria) : undefined;
    } catch {
      throw new HttpException(
        `Failed to parse searchCriteria: ${query.searchCriteria}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const { include, limit, ...userQuery } = searchQuery || { include: [], limit: undefined };
    const users = await this.userService.getUsers(userQuery, include || [], limit);
    return users;
  }

  @ApiBearerAuth()
  @Get('/bulk-upload-mailchimp-profiles')
  @UseGuards(SuperAdminAuthGuard)
  async bulkUploadMailchimpProfiles() {}

  @ApiBearerAuth()
  @Get('/bulk-update-mailchimp-profiles')
  @UseGuards(SuperAdminAuthGuard)
  async bulkUpdateMailchimpProfiles() {
    await this.serviceUserProfilesService.bulkUpdateMailchimpProfiles();
    return 'ok';
  }
}
