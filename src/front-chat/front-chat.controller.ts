import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { FirebaseAuthGuard } from 'src/firebase/firebase-auth.guard';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { ChatHistoryMessage, FrontChatService } from './front-chat.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'application/pdf',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

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
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type "${file.mimetype}" is not allowed`), false);
        }
      },
    }),
  )
  async uploadAttachment(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    if (!file) throw new BadRequestException('No file provided');
    await this.serviceUserProfilesService.ensureFrontContact(req.userEntity);
    await this.frontChatService.sendChannelAttachment(req.userEntity, file);

    // Fire-and-forget: sync updated chat activity timestamps to external services.
    this.frontChatService.getChatUser(req.userEntity.id).then((chatUser) => {
      if (chatUser) {
        return this.serviceUserProfilesService
          .updateServiceUserProfilesChatActivity(chatUser, req.userEntity.email)
          .catch(() => {});
      }
    }).catch(() => {});
  }

  @Get('messages')
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async getMessages(@Request() req): Promise<{ messages: ChatHistoryMessage[] }> {
    const messages = await this.frontChatService.getConversationHistory(req.userEntity);
    return { messages };
  }

  @Patch('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @UseGuards(FirebaseAuthGuard)
  async markAsRead(@Request() req): Promise<void> {
    const chatUser = await this.frontChatService.markAsRead(req.userEntity.id);
    if (chatUser) {
      this.serviceUserProfilesService
        .updateServiceUserProfilesChatActivity(chatUser, req.userEntity.email)
        .catch(() => {});
    }
  }
}
