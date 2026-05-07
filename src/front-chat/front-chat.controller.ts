import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { FirebaseAuthGuard } from 'src/firebase/firebase-auth.guard';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import {
  FRONT_CHAT_ATTACHMENT_ALLOWED_MIME_TYPES,
  FRONT_CHAT_ATTACHMENT_MAX_FILE_SIZE,
} from 'src/utils/constants';
import { normalizeFrontAttachmentUrl } from './front-chat.helpers';
import { ChatHistoryMessage, FrontChatService } from './front-chat.service';

@ApiTags('Front Chat')
@Controller('/v1/front-chat')
export class FrontChatController {
  constructor(
    private readonly frontChatService: FrontChatService,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
  ) {}

  @Post('attachments')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: FRONT_CHAT_ATTACHMENT_MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (FRONT_CHAT_ATTACHMENT_ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type "${file.mimetype}" is not allowed`), false);
        }
      },
    }),
  )
  async uploadAttachment(@Request() req, @UploadedFile() file: Express.Multer.File): Promise<void> {
    if (!file) throw new BadRequestException('No file provided');
    const existingChatUser = await this.frontChatService.getChatUser(req.userEntity.id);
    if (!existingChatUser?.frontContactId) {
      await this.serviceUserProfilesService.getOrCreateFrontContact(req.userEntity);
    }
    const chatUser = await this.frontChatService.sendChannelAttachment(req.userEntity, file);
    this.syncChatActivity(chatUser, req.userEntity.email);
  }

  @Get('attachment-proxy')
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async proxyAttachment(@Query('url') url: string, @Res() res: Response): Promise<void> {
    if (!normalizeFrontAttachmentUrl(url ?? '')) {
      throw new BadRequestException('Invalid attachment URL');
    }
    let buffer: Buffer;
    let contentType: string;
    try {
      ({ buffer, contentType } = await this.frontChatService.fetchAttachment(url));
    } catch {
      throw new NotFoundException('Attachment not found');
    }
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, max-age=3600');
    res.set('Content-Disposition', 'inline');
    res.send(buffer);
  }

  @Get('messages')
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async getMessages(@Request() req): Promise<{ messages: ChatHistoryMessage[] }> {
    const { messages } = await this.frontChatService.getConversationHistory(req.userEntity);
    return { messages };
  }

  @Patch('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async markAsRead(@Request() req): Promise<void> {
    const chatUser = await this.frontChatService.markAsRead(req.userEntity.id);
    this.syncChatActivity(chatUser, req.userEntity.email);
  }

  // Fire-and-forget — chat activity sync is best-effort and must not block the user.
  private syncChatActivity(chatUser: Awaited<ReturnType<FrontChatService['markAsRead']>>, email: string) {
    if (!chatUser) return;
    this.serviceUserProfilesService
      .updateServiceUserProfilesChatActivity(chatUser, email)
      .catch(() => {});
  }
}
