import { healthCheck } from './mailchip-api';

jest.mock('@mailchimp/mailchimp_transactional', () => () => ({
  users: {
    ping: async () => {
      return 'PONG!';
    },
  },
}));

describe('Mailchimp api', () => {
  it('healthCheck', async () => {
    await expect(healthCheck()).resolves.toEqual('PONG!');
  });
});
