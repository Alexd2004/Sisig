/**
 * Query key factory for React Query.
 * Centralizes all query keys to prevent duplicates and enable cache invalidation.
 */

export const keys = {
  auth: {
    session: () => ['auth', 'session'] as const,
    user: () => ['auth', 'user'] as const,
  },
  menu: {
    all: () => ['menu'] as const,
    list: (filters?: Record<string, unknown>) => ['menu', 'list', filters] as const,
    categories: () => ['menu', 'categories'] as const,
    item: (id: string) => ['menu', 'item', id] as const,
  },
  orders: {
    all: () => ['orders'] as const,
    list: () => ['orders', 'list'] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  loyalty: {
    all: () => ['loyalty'] as const,
    points: () => ['loyalty', 'points'] as const,
    transactions: () => ['loyalty', 'transactions'] as const,
    rewards: () => ['loyalty', 'rewards'] as const,
  },
  profile: {
    all: () => ['profile'] as const,
    me: () => ['profile', 'me'] as const,
    user: (id: string) => ['profile', 'user', id] as const,
  },
} as const;

/**
 * Allowlist of query-key prefixes that may be written to disk (no personal data).
 * A query is persisted only if its key starts with one of these prefixes:
 * ['menu'] covers every menu query, ['loyalty', 'rewards'] only the rewards catalogue.
 * Loyalty points, profile, orders and auth are never persisted.
 */
export const persistedQueryKeyPrefixes: readonly (readonly unknown[])[] = [
  keys.menu.all(),
  keys.loyalty.rewards(),
];

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  return persistedQueryKeyPrefixes.some((prefix) =>
    prefix.every((part, index) => queryKey[index] === part)
  );
}
