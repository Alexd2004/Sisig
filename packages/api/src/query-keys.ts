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
    list: (filters?: Record<string, unknown>) =>
      ['menu', 'list', filters] as const,
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
 * Queries that are safe to persist to disk (no personal data).
 * Loyalty, profile, and orders are not persisted.
 */
export const persistedQueryKeys = [
  ...keys.menu.all(),
  ...keys.loyalty.rewards(),
];
