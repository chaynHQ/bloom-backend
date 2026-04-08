import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SuperAdminAuthGuard } from 'src/partner-admin/super-admin-auth.guard';
import { FrontChatService } from './front-chat.service';

@ApiTags('Front Chat')
@Controller('front-chat')
@UseGuards(SuperAdminAuthGuard)
export class FrontChatController {
  constructor(private readonly frontChatService: FrontChatService) {}
}
