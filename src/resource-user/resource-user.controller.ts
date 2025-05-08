import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { UserEntity } from '../entities/user.entity';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { UpdateResourceUserDto } from './dtos/update-resource-user.dto';
import { ResourceUserService } from './resource-user.service';

@ApiTags('Resource User')
@ControllerDecorator()
@Controller('/v1/resource-user')
export class ResourceUserController {
  constructor(private readonly resourceUserService: ResourceUserService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Stores relationship between a `User` and `Resource` records, once a user has started a resource.',
  })
  @UseGuards(FirebaseAuthGuard)
  async createResourceUser(
    @Req() req: Request,
    @Body() createResourceUserDto: UpdateResourceUserDto,
  ) {
    return await this.resourceUserService.createResourceUser(
      req['userEntity'] as UserEntity,
      createResourceUserDto,
    );
  }

  @Post('/complete')
  @ApiOperation({
    description: 'Updates a users resources progress to completed',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async complete(@Req() req: Request, @Body() updateResourceUserDto: UpdateResourceUserDto) {
    return await this.resourceUserService.setResourceUserCompleted(
      req['userEntity'] as UserEntity,
      updateResourceUserDto,
      true,
    );
  }

  @Post('/incomplete')
  @ApiOperation({
    description:
      'Updates a users resources progress to incomplete, undoing a previous complete action',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async incomplete(@Req() req: Request, @Body() updateResourceUserDto: UpdateResourceUserDto) {
    return await this.resourceUserService.setResourceUserCompleted(
      req['userEntity'] as UserEntity,
      updateResourceUserDto,
      false,
    );
  }
}
