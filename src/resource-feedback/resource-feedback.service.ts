import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ResourceEntity } from 'src/entities/resource.entity';
import { ResourceService } from 'src/resource/resource.service';
import { Repository } from 'typeorm';
import { ResourceFeedbackEntity } from '../entities/resource-feedback.entity';
import { CreateResourceFeedbackDto } from './dtos/create-resource-feedback.dto';

const logger = new Logger('ResourceFeedbackService');

@Injectable()
export class ResourceFeedbackService {
  constructor(
    @InjectRepository(ResourceFeedbackEntity)
    private resourceFeedbackRepository: Repository<ResourceFeedbackEntity>,
    private readonly resourceService: ResourceService,
    private slackMessageClient: SlackMessageClient,
  ) {}

  async create(resourceFeedbackDto: CreateResourceFeedbackDto): Promise<ResourceFeedbackEntity> {
    const resource = await this.resourceService.findOne(resourceFeedbackDto.resourceId);

    if (!resource) {
      throw new HttpException('RESOURCE NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const resourceFeedback = await this.resourceFeedbackRepository.save(resourceFeedbackDto);
    this.sendSlackResourceFeedback(resourceFeedbackDto, resource);

    return resourceFeedback;
  }

  // We don't need to wait for this to finish so async is not needed
  sendSlackResourceFeedback(
    resourceFeedbackDto: CreateResourceFeedbackDto,
    resource: ResourceEntity,
  ) {
    try {
      this.slackMessageClient.sendMessageToBloomUserChannel(
        `*${resource.name}* resource was rated *_${resourceFeedbackDto.feedbackTags}_* ${resourceFeedbackDto.feedbackDescription.length > 0 ? `with the comment: \n> _${resourceFeedbackDto.feedbackDescription}_` : ''}`,
      );
    } catch (error) {
      logger.error(`Failed to send Slack message for resource feedback: ${error.message}`);
    }
  }
}
