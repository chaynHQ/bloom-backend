import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from 'src/firebase/firebase-auth.guard';
import { ControllerDecorator } from 'src/utils/controller.decorator';
import { EVENT_NAME } from './event-logger.interface';
import { EventLoggerService } from './event-logger.service';

@ApiTags('Event Logger')
@ControllerDecorator()
@Controller('/v1/event-logger')
export class EventLoggerController {
  constructor(private readonly eventLoggerService: EventLoggerService) {}

  @Post()
  @ApiOperation({
    description: 'Creates an event log',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async complete(@Req() req: Request, @Body() event: EVENT_NAME) {
    const now = new Date();
    return await this.eventLoggerService.createEventLog({
      userId: req['userEntity'].id,
      event,
      date: now,
    });
  }
}
