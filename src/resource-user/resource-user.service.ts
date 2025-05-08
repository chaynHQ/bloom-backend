import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ResourceService } from 'src/resource/resource.service';
import { formatResourceUserObject } from 'src/utils/serialize';
import { Repository } from 'typeorm';
import { ResourceUserDto } from './dtos/resource-user.dto';
import { UpdateResourceUserDto } from './dtos/update-resource-user.dto';

@Injectable()
export class ResourceUserService {
  constructor(
    @InjectRepository(ResourceUserEntity)
    private resourceUserRepository: Repository<ResourceUserEntity>,
    private resourceService: ResourceService,
  ) {}

  private async getResourceUser({
    resourceId,
    userId,
  }: ResourceUserDto): Promise<ResourceUserEntity> {
    return await this.resourceUserRepository
      .createQueryBuilder('resource_user')
      .leftJoinAndSelect('resource_user.resource', 'resource')
      .where('resource_user.userId = :userId', { userId })
      .andWhere('resource_user.resourceId = :resourceId', { resourceId })
      .getOne();
  }

  async createResourceUserRecord({
    resourceId,
    userId,
  }: ResourceUserDto): Promise<ResourceUserEntity> {
    return await this.resourceUserRepository.save({
      resourceId,
      userId,
      completedAt: null,
    });
  }

  public async createResourceUser(user: UserEntity, { storyblokUuid }: UpdateResourceUserDto) {
    const resource = await this.resourceService.gerResourceByStoryblokUuid(storyblokUuid);

    if (!resource) {
      throw new HttpException('RESOURCE NOT FOUND', HttpStatus.NOT_FOUND);
    }

    let resourceUser = await this.getResourceUser({
      resourceId: resource.id,
      userId: user.id,
    });

    if (!resourceUser) {
      resourceUser = await this.createResourceUserRecord({
        resourceId: resource.id,
        userId: user.id,
      });
    }

    return formatResourceUserObject([{ ...resourceUser, resource }])[0];
  }

  public async setResourceUserCompleted(
    user: UserEntity,
    { storyblokUuid }: UpdateResourceUserDto,
    completed: boolean,
  ) {
    const resource = await this.resourceService.gerResourceByStoryblokUuid(storyblokUuid);

    if (!resource) {
      throw new HttpException(
        `Resource not found for storyblok uuid: ${storyblokUuid}`,
        HttpStatus.NOT_FOUND,
      );
    }

    let resourceUser = await this.getResourceUser({
      resourceId: resource.id,
      userId: user.id,
    });

    if (resourceUser) {
      resourceUser = await this.resourceUserRepository.save({
        ...resourceUser,
        completedAt: completed ? new Date() : null,
      });
    } else {
      resourceUser = await this.createResourceUserRecord({
        resourceId: resource.id,
        userId: user.id,
      });
    }

    return formatResourceUserObject([{ ...resourceUser, resource }])[0];
  }
}
