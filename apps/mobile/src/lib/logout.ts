import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import { clearPersistedQueries } from './query-persistence';
import { clearSessionStorage } from './session-storage';

/**
 * Sign out and purge everything the previous user left on the device: the Supabase session,
 * the encrypted session entries and AES key, the in-memory query cache and the persisted cache.
 * The purge runs even if sign-out fails, and the sign-out error is still rethrown.
 */
export async function signOutAndPurge(
  client: SupabaseClient,
  queryClient: QueryClient
): Promise<void> {
  try {
    await queryClient.cancelQueries();
    // Local scope clears this device only and does not depend on the network.
    await client.auth.signOut({ scope: 'local' });
  } finally {
    await clearSessionStorage();
    await clearPersistedQueries();
    queryClient.clear();
  }
}
