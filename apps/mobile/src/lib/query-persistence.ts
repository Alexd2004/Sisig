import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';
import { shouldPersistQuery } from '@sisig/api';

const CACHE_KEY = 'sisig.query-cache';

/** Bump when the shape of a persisted query changes, so old caches are discarded. */
const CACHE_BUSTER = 'v1';

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
});

/**
 * Options for PersistQueryClientProvider (mounted by the root layout).
 * Only allowlisted, successful queries are written to disk. Mutations are never persisted.
 */
export const persistOptions = {
  persister: queryPersister,
  maxAge: 24 * 60 * 60 * 1000,
  buster: CACHE_BUSTER,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === 'success' && shouldPersistQuery(query.queryKey),
    shouldDehydrateMutation: () => false,
  },
};

/** Remove the persisted query cache from disk (used on logout). */
export async function clearPersistedQueries(): Promise<void> {
  await queryPersister.removeClient();
}
