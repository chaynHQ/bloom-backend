import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ControllerDecorator } from '../utils/controller.decorator';
import { SessionDto } from './dto/session.dto';
import { SessionService } from './session.service';

@ApiTags('Course')
@ControllerDecorator()
@Controller('/v1/session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  async createSession(@Body() sessionDto: SessionDto) {
    return this.sessionService.createSession(sessionDto);
  }

  @Patch(':storyblokId')
  async updateSession(
    @Param('storyblokId') storyblokId: string,
    @Body() body: Partial<SessionDto>,
  ) {
    return this.sessionService.updateSession(storyblokId, body);
  }
}
