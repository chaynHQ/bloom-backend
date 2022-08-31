import { healthCheck } from './mailchip-api';

describe('Mailchimp api', () => {
  it('healthCheck', async () => {
    await expect(healthCheck()).resolves.toEqual('PONG!');
  });
});
