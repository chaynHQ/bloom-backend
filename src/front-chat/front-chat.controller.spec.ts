import { BadRequestException } from '@nestjs/common';
import { UserEntity } from 'src/entities/user.entity';
import { FrontChatController } from './front-chat.controller';

describe('FrontChatController', () => {
  let controller: FrontChatController;
  let frontChatService: { sendChannelAttachment: jest.Mock };
  let serviceUserProfilesService: { ensureFrontContact: jest.Mock };

  const buildFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
    ({
      buffer: Buffer.from('binary'),
      mimetype: 'image/png',
      originalname: 'photo.png',
      size: 6,
      ...overrides,
    }) as Express.Multer.File;

  beforeEach(() => {
    frontChatService = { sendChannelAttachment: jest.fn().mockResolvedValue(undefined) };
    serviceUserProfilesService = {
      ensureFrontContact: jest.fn().mockResolvedValue(undefined),
    };
    controller = new FrontChatController(
      frontChatService as any,
      serviceUserProfilesService as any,
    );
  });

  it('forwards the file to FrontChatService along with the authed user', async () => {
    const user = { id: 'u1', email: 'u@example.com' } as UserEntity;
    const file = buildFile();

    await controller.uploadAttachment({ userEntity: user } as any, file);

    expect(frontChatService.sendChannelAttachment).toHaveBeenCalledWith(user, file);
  });

  it('throws when no file is provided', async () => {
    await expect(
      controller.uploadAttachment({ userEntity: {} } as any, undefined as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(frontChatService.sendChannelAttachment).not.toHaveBeenCalled();
  });
});
