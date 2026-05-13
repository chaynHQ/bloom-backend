import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

jest.mock('src/utils/constants', () => {
  const actual = jest.requireActual('src/utils/constants');
  return {
    ...actual,
    simplybookWebhookSecret: 'test-secret-value',
  };
});

import { SimplybookWebhookGuard } from './simplybook-webhook.guard';

const buildContext = (query: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ query }),
    }),
  }) as unknown as ExecutionContext;

describe('SimplybookWebhookGuard', () => {
  const guard = new SimplybookWebhookGuard();

  it('allows a request with the correct token', () => {
    expect(guard.canActivate(buildContext({ token: 'test-secret-value' }))).toBe(true);
  });

  it('rejects a request with no token', () => {
    expect(() => guard.canActivate(buildContext({}))).toThrow(UnauthorizedException);
  });

  it('rejects a request with the wrong token of the same length', () => {
    expect(() => guard.canActivate(buildContext({ token: 'wrong-secret-value' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request with a token of different length', () => {
    expect(() => guard.canActivate(buildContext({ token: 'short' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request when token is an array (duplicate query params)', () => {
    expect(() =>
      guard.canActivate(buildContext({ token: ['test-secret-value', 'extra'] })),
    ).toThrow(UnauthorizedException);
  });
});
