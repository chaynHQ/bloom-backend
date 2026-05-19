import { Test, TestingModule } from '@nestjs/testing';
import { MAILCHIMP_CUSTOM_EVENTS } from 'src/api/mailchimp/mailchimp-api.interfaces';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { FrontChatScheduler } from './front-chat.scheduler';
import { FrontChatService } from './front-chat.service';

// End-to-end behaviour of the unread-message notification flow: the cron fires,
// the service yields eligible users, the scheduler marks pending, hands the event
// to Mailchimp (with recovery), and records success or failure on the chat_user row.

describe('FrontChatScheduler — unread notification flow', () => {
  let scheduler: FrontChatScheduler;
  let frontChatService: jest.Mocked<Pick<
    FrontChatService,
    | 'getUsersWithUnreadMessages'
    | 'markUnreadNotificationPending'
    | 'markUnreadNotificationSent'
    | 'markUnreadNotificationFailed'
  >>;
  let serviceUserProfiles: jest.Mocked<Pick<ServiceUserProfilesService, 'sendMailchimpUserEventWithRecovery'>>;

  const buildChatUser = (id: string): ChatUserEntity =>
    ({ id, userId: `u-${id}`, unreadNotificationAttempts: 0 }) as ChatUserEntity;

  beforeEach(async () => {
    frontChatService = {
      getUsersWithUnreadMessages: jest.fn().mockResolvedValue([]),
      markUnreadNotificationPending: jest.fn().mockResolvedValue(undefined),
      markUnreadNotificationSent: jest.fn().mockResolvedValue(undefined),
      markUnreadNotificationFailed: jest.fn().mockResolvedValue(undefined),
    };
    serviceUserProfiles = {
      sendMailchimpUserEventWithRecovery: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrontChatScheduler,
        { provide: FrontChatService, useValue: frontChatService },
        { provide: ServiceUserProfilesService, useValue: serviceUserProfiles },
      ],
    }).compile();

    scheduler = module.get(FrontChatScheduler);
  });

  it('marks pending → sends Mailchimp event → marks sent for each eligible user', async () => {
    frontChatService.getUsersWithUnreadMessages.mockResolvedValue([
      { chatUser: buildChatUser('cu-1'), email: 'a@example.com' },
      { chatUser: buildChatUser('cu-2'), email: 'b@example.com' },
    ]);

    await scheduler.checkUnreadMessages();

    expect(frontChatService.markUnreadNotificationPending).toHaveBeenCalledWith('cu-1');
    expect(frontChatService.markUnreadNotificationPending).toHaveBeenCalledWith('cu-2');
    expect(serviceUserProfiles.sendMailchimpUserEventWithRecovery).toHaveBeenCalledWith(
      'a@example.com',
      MAILCHIMP_CUSTOM_EVENTS.FRONT_MESSAGE_UNREAD,
    );
    expect(serviceUserProfiles.sendMailchimpUserEventWithRecovery).toHaveBeenCalledWith(
      'b@example.com',
      MAILCHIMP_CUSTOM_EVENTS.FRONT_MESSAGE_UNREAD,
    );
    expect(frontChatService.markUnreadNotificationSent).toHaveBeenCalledWith('cu-1');
    expect(frontChatService.markUnreadNotificationSent).toHaveBeenCalledWith('cu-2');
    expect(frontChatService.markUnreadNotificationFailed).not.toHaveBeenCalled();
  });

  it('marks pending before the Mailchimp call so a restart between the two cannot double-send', async () => {
    const order: string[] = [];
    frontChatService.getUsersWithUnreadMessages.mockResolvedValue([
      { chatUser: buildChatUser('cu-1'), email: 'a@example.com' },
    ]);
    frontChatService.markUnreadNotificationPending.mockImplementation(async () => {
      order.push('pending');
    });
    serviceUserProfiles.sendMailchimpUserEventWithRecovery.mockImplementation(async () => {
      order.push('mailchimp');
    });
    frontChatService.markUnreadNotificationSent.mockImplementation(async () => {
      order.push('sent');
    });

    await scheduler.checkUnreadMessages();

    expect(order).toEqual(['pending', 'mailchimp', 'sent']);
  });

  it('records the failure and does not mark sent when the Mailchimp event throws', async () => {
    frontChatService.getUsersWithUnreadMessages.mockResolvedValue([
      { chatUser: buildChatUser('cu-1'), email: 'a@example.com' },
    ]);
    serviceUserProfiles.sendMailchimpUserEventWithRecovery.mockRejectedValueOnce(
      new Error('mailchimp 502'),
    );

    await scheduler.checkUnreadMessages();

    expect(frontChatService.markUnreadNotificationPending).toHaveBeenCalledWith('cu-1');
    expect(frontChatService.markUnreadNotificationSent).not.toHaveBeenCalled();
    expect(frontChatService.markUnreadNotificationFailed).toHaveBeenCalledWith(
      'cu-1',
      'mailchimp 502',
    );
  });

  it('isolates failures per user — one failing send does not block the others in the batch', async () => {
    frontChatService.getUsersWithUnreadMessages.mockResolvedValue([
      { chatUser: buildChatUser('cu-1'), email: 'a@example.com' },
      { chatUser: buildChatUser('cu-2'), email: 'b@example.com' },
      { chatUser: buildChatUser('cu-3'), email: 'c@example.com' },
    ]);
    serviceUserProfiles.sendMailchimpUserEventWithRecovery.mockImplementation(async (email) => {
      if (email === 'b@example.com') throw new Error('boom');
    });

    await scheduler.checkUnreadMessages();

    expect(frontChatService.markUnreadNotificationSent).toHaveBeenCalledWith('cu-1');
    expect(frontChatService.markUnreadNotificationFailed).toHaveBeenCalledWith('cu-2', 'boom');
    expect(frontChatService.markUnreadNotificationSent).toHaveBeenCalledWith('cu-3');
    expect(frontChatService.markUnreadNotificationSent).not.toHaveBeenCalledWith('cu-2');
  });

  it('skips the Mailchimp send entirely if the pending DB write fails, so we never send unrecorded', async () => {
    frontChatService.getUsersWithUnreadMessages.mockResolvedValue([
      { chatUser: buildChatUser('cu-1'), email: 'a@example.com' },
    ]);
    frontChatService.markUnreadNotificationPending.mockRejectedValueOnce(new Error('db down'));

    await scheduler.checkUnreadMessages();

    expect(serviceUserProfiles.sendMailchimpUserEventWithRecovery).not.toHaveBeenCalled();
    expect(frontChatService.markUnreadNotificationSent).not.toHaveBeenCalled();
    expect(frontChatService.markUnreadNotificationFailed).not.toHaveBeenCalled();
  });

});
