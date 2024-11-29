import {
  Body,
  Controller,
  HttpException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from 'src/firebase/firebase-auth.guard';
import { CreateResourceUserDto } from './dtos/create-resource-user.dto';
import { UpdateResourceUserDto } from './dtos/update-resource-user.dto';
import { ResourceUserService } from './resource-user.service';

@Controller('v1/resource-user')
export class ResourceUserController {
  constructor(private readonly resourceUserService: ResourceUserService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Updates resource_user table',
  })
  @UseGuards(FirebaseAuthGuard)
  create(@Req() req: Request, @Body() createResourceUserDto: CreateResourceUserDto) {
    if (req['userEntity'].id !== createResourceUserDto.userId) {
      throw new HttpException('Unauthorized', 401);
    }
    return this.resourceUserService.create(createResourceUserDto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Updates resource_user table',
  })
  @UseGuards(FirebaseAuthGuard)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateResourceUserDto: UpdateResourceUserDto,
  ) {
    return this.resourceUserService.update(id, updateResourceUserDto);
  }
}
