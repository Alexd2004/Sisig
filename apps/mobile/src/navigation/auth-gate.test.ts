import { resolveAuthRedirect, sanitizeReturnTo } from './auth-gate';

describe('resolveAuthRedirect', () => {
  it('does nothing while the session is still loading', () => {
    expect(
      resolveAuthRedirect({ status: 'loading', segments: ['(auth)', 'login'], returnTo: undefined })
    ).toBeNull();
  });

  it('sends a signed-in user from the auth stack to Home', () => {
    expect(
      resolveAuthRedirect({
        status: 'signed-in',
        segments: ['(auth)', 'welcome'],
        returnTo: undefined,
      })
    ).toBe('/home');
  });

  it('returns a signed-in user to the tab they tried to open', () => {
    expect(
      resolveAuthRedirect({
        status: 'signed-in',
        segments: ['(auth)', 'login'],
        returnTo: '/rewards',
      })
    ).toBe('/rewards');
  });

  it('ignores a returnTo that is not an in-app tab', () => {
    expect(
      resolveAuthRedirect({
        status: 'signed-in',
        segments: ['(auth)', 'login'],
        returnTo: 'https://example.com',
      })
    ).toBe('/home');
  });

  it('leaves a signed-out guest on the auth stack', () => {
    expect(
      resolveAuthRedirect({
        status: 'signed-out',
        segments: ['(auth)', 'login'],
        returnTo: '/code',
      })
    ).toBeNull();
  });

  it('leaves a signed-in user on a tab alone', () => {
    expect(
      resolveAuthRedirect({
        status: 'signed-in',
        segments: ['(tabs)', 'rewards', 'index'],
        returnTo: undefined,
      })
    ).toBeNull();
  });

  it('leaves a guest on a browsable tab alone', () => {
    expect(
      resolveAuthRedirect({
        status: 'signed-out',
        segments: ['(tabs)', 'home', 'index'],
        returnTo: undefined,
      })
    ).toBeNull();
  });
});

describe('sanitizeReturnTo', () => {
  it('accepts each tab path', () => {
    for (const path of ['/home', '/order', '/rewards', '/code', '/more']) {
      expect(sanitizeReturnTo(path)).toBe(path);
    }
  });

  it('rejects anything else', () => {
    expect(sanitizeReturnTo('/redeem-confirm')).toBeNull();
    expect(sanitizeReturnTo(['/rewards'])).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
  });
});
