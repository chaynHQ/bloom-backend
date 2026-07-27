import {
  chatClientContextToCustomFields,
  sanitizeChatClientContext,
  serializeCustomFields,
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

describe('serializeCustomFields', () => {
  it('converts datetime fields from ISO strings to epoch seconds', () => {
    expect(
      serializeCustomFields({
        signed_up_at: '2024-03-01T10:30:00.000Z',
        last_active_at: '2025-11-20T08:00:00.000Z',
        deleted_at: '2026-01-15T23:59:59.000Z',
        therapy_session_first_at: '2024-04-02T09:00:00.000Z',
        therapy_session_next_at: '2026-08-01T12:00:00.000Z',
        therapy_session_last_at: '2026-02-10T15:45:00.000Z',
      }),
    ).toEqual({
      signed_up_at: 1709289000,
      last_active_at: 1763625600,
      deleted_at: 1768521599,
      therapy_session_first_at: 1712048400,
      therapy_session_next_at: 1785585600,
      therapy_session_last_at: 1770738300,
    });
  });

  it('leaves non-datetime fields untouched', () => {
    expect(
      serializeCustomFields({
        user_id: 'abc-123',
        language: 'en',
        marketing_permission: true,
        therapy_sessions_remaining: 3,
      }),
    ).toEqual({
      user_id: 'abc-123',
      language: 'en',
      marketing_permission: true,
      therapy_sessions_remaining: 3,
    });
  });

  it('passes through datetime values already in epoch seconds', () => {
    expect(serializeCustomFields({ signed_up_at: 1709289000 })).toEqual({
      signed_up_at: 1709289000,
    });
  });

  it('omits unparseable datetime values rather than sending 1970', () => {
    expect(
      serializeCustomFields({ signed_up_at: 'not-a-date', last_active_at: '' as string }),
    ).toEqual({});
  });

  it('omits undefined and null values', () => {
    expect(
      serializeCustomFields({
        user_id: 'abc-123',
        signed_up_at: undefined,
        language: null as unknown as string,
      }),
    ).toEqual({ user_id: 'abc-123' });
  });
});
