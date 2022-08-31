import { MailchimpClient, MAILCHIMP_EMAIL_STATUS } from './mailchip-api';

jest.mock('@mailchimp/mailchimp_transactional', () =>
  jest.fn().mockImplementation(() => ({
    users: {
      ping: async () => {
        return 'PONG!';
      },
    },
    messages: {
      sendTemplate: async ({ message, template_name }) => {
        if (template_name == 'throw error') {
          throw new Error('Error');
        }
        return [
          {
            _id: 'b4c1b4276c2b40fe8e891ef25a287920',
            email: message.to[0].email,
            reject_reason: null,
            status: 'sent',
          },
        ];
      },
    },
  })),
);

describe('Mailchimp api', () => {
  const mailchimpClient = new MailchimpClient();
  it('healthCheck', async () => {
    await expect(mailchimpClient.healthCheck()).resolves.toEqual('PONG!');
  });

  it('sends therapy email', async () => {
    const response = await mailchimpClient.sendTherapyFeedbackEmail('test@test.com');
    expect(response[0]).toHaveProperty('status', MAILCHIMP_EMAIL_STATUS.SENT);
    expect(response[0]).toHaveProperty('email', 'test@test.com');
  });

  it('sends template email', async () => {
    const response = await mailchimpClient.sendTemplateEmail('tid', {
      from_email: 'a@b.com',
      subject: 'blah',
      to: [
        {
          email: 'b@c.com',
          type: 'to',
        },
      ],
    });
    expect(response[0]).toHaveProperty('status', MAILCHIMP_EMAIL_STATUS.SENT);
    expect(response[0]).toHaveProperty('email', 'b@c.com');
  });
  it('sends template email when error thrown', async () => {
    await expect(
      mailchimpClient.sendTemplateEmail('throw error', {
        from_email: 'a@b.com',
        subject: 'blah',
        to: [
          {
            email: 'b@c.com',
            type: 'to',
          },
        ],
      }),
    ).rejects.toThrow();
  });
});
