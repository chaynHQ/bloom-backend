import {
  chatClientContextToCustomFields,
  sanitizeChatClientContext,
} from './front-chat.helpers';

describe('sanitizeChatClientContext', () => {
  it('accepts valid coarse context', () => {
    expect(
      sanitizeChatClientContext({
        browserLanguage: 'en-GB',
        timezone: 'Europe/Berlin',
        deviceType: 'mobile',
        os: 'iOS',
        browser: 'Safari',
      }),
    ).toEqual({
      browserLanguage: 'en-GB',
      timezone: 'Europe/Berlin',
      deviceType: 'mobile',
      os: 'iOS',
      browser: 'Safari',
    });
  });

  it('drops values outside the allow-lists but keeps valid ones', () => {
    expect(
      sanitizeChatClientContext({
        deviceType: 'watch', // not allow-listed
        os: 'iOS',
        browser: 'NetscapeNavigator', // not allow-listed
      }),
    ).toEqual({ os: 'iOS' });
  });

  it('rejects malformed timezone and language', () => {
    expect(
      sanitizeChatClientContext({
        timezone: 'Europe/Berlin; DROP TABLE', // invalid chars
        browserLanguage: 'not a language!',
      }),
    ).toBeNull();
  });

  it('rejects over-long strings', () => {
    expect(sanitizeChatClientContext({ timezone: 'A'.repeat(200) })).toBeNull();
  });

  it('returns null for empty or non-object input', () => {
    expect(sanitizeChatClientContext(null)).toBeNull();
    expect(sanitizeChatClientContext('nope')).toBeNull();
    expect(sanitizeChatClientContext({})).toBeNull();
    expect(sanitizeChatClientContext({ deviceType: 'desktop-extra' })).toBeNull();
  });
});

describe('chatClientContextToCustomFields', () => {
  it('maps context to snake_case Front fields, skipping absent values', () => {
    expect(
      chatClientContextToCustomFields({
        browserLanguage: 'de-DE',
        timezone: 'Europe/Berlin',
        os: 'Android',
        browser: undefined,
      }),
    ).toEqual({
      browser_language: 'de-DE',
      timezone: 'Europe/Berlin',
      os: 'Android',
    });
  });

  it('returns an empty object for null context', () => {
    expect(chatClientContextToCustomFields(null)).toEqual({});
  });
});
