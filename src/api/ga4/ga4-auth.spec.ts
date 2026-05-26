jest.mock('google-auth-library', () => {
  const getAccessToken = jest.fn();
  class GoogleAuth {
    constructor(public opts: unknown) {}
    getAccessToken = getAccessToken;
  }
  return { GoogleAuth, __getAccessTokenMock: getAccessToken };
});

describe('Ga4AuthService', () => {
  const ORIGINAL_ENV = process.env;
  const mockKey = {
    client_email: 'reporting@project.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('accepts base64-encoded credentials and caches the token across calls', async () => {
    process.env.GA4_SERVICE_ACCOUNT_KEY_JSON = Buffer.from(JSON.stringify(mockKey)).toString(
      'base64',
    );
    const { Ga4AuthService } = await import('./ga4-auth');
    const mock = (await import('google-auth-library')) as unknown as {
      __getAccessTokenMock: jest.Mock;
    };
    mock.__getAccessTokenMock.mockResolvedValue({ token: 'tkn' });

    const svc = new Ga4AuthService();
    expect(await svc.getAccessToken()).toBe('tkn');
    expect(await svc.getAccessToken()).toBe('tkn');
    // Cache hit on the second call — only one underlying fetch.
    expect(mock.__getAccessTokenMock).toHaveBeenCalledTimes(1);
  });
});
