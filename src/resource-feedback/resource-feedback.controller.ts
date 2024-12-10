import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { CreateResourceFeedbackDto } from './dtos/create-resource-feedback.dto';
import { ResourceFeedbackService } from './resource-feedback.service';

@ApiTags('Resource Feedback')
@ControllerDecorator()
@Controller('/v1/resource-feedback')
export class ResourceFeedbackController {
  constructor(private readonly resourceFeedbackService: ResourceFeedbackService) {}

  // TODO how do we protect this public endpoint from being abused?
  @Post()
  @ApiOperation({
    description: 'Stores feedback from a user',
  })
  create(@Body() createResourceFeedbackDto: CreateResourceFeedbackDto) {
    return this.resourceFeedbackService.create(createResourceFeedbackDto);
  }
}
