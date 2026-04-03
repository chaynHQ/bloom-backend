import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from 'src/firebase/firebase-auth.guard';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { CreateResourceFeedbackDto } from './dtos/create-resource-feedback.dto';
import { ResourceFeedbackService } from './resource-feedback.service';

@ApiTags('Resource Feedback')
@ControllerDecorator()
@Controller('/v1/resource-feedback')
export class ResourceFeedbackController {
  constructor(private readonly resourceFeedbackService: ResourceFeedbackService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    description: 'Stores feedback from a user',
  })
  create(@Body() createResourceFeedbackDto: CreateResourceFeedbackDto) {
    return this.resourceFeedbackService.create(createResourceFeedbackDto);
  }
}
