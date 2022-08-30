import { healthCheck } from './mailchip-api';

describe('Mailchimp api', () => {
  it('healthCheck', async () => {
    expect(healthCheck()).resolves.toEqual({ health_status: "Everything's Chimpy!" });
  });
});
