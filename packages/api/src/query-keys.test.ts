import { keys, persistedQueryKeyPrefixes, shouldPersistQuery } from './query-keys';

describe('shouldPersistQuery', () => {
  it.each([
    ['menu categories', keys.menu.categories()],
    ['menu list with filters', keys.menu.list({ category: 'burger' })],
    ['menu item', keys.menu.item('product-1')],
    ['rewards catalogue', keys.loyalty.rewards()],
  ])('persists the allowlisted %s', (_name, queryKey) => {
    expect(shouldPersistQuery(queryKey)).toBe(true);
  });

  it.each([
    ['loyalty points', keys.loyalty.points()],
    ['loyalty transactions', keys.loyalty.transactions()],
    ['profile', keys.profile.me()],
    ['orders', keys.orders.list()],
    ['auth session', keys.auth.session()],
  ])('never persists %s', (_name, queryKey) => {
    expect(shouldPersistQuery(queryKey)).toBe(false);
  });

  it('does not allowlist the loyalty root, so points stay out of the cache', () => {
    expect(shouldPersistQuery(['loyalty'])).toBe(false);
    expect(shouldPersistQuery(['loyalty', 'points'])).toBe(false);
  });

  it('allowlists exactly the menu and rewards-catalogue prefixes', () => {
    expect(persistedQueryKeyPrefixes).toEqual([['menu'], ['loyalty', 'rewards']]);
  });
});
