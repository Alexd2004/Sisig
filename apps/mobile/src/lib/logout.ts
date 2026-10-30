import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import { clearPersistedQueries } from './query-persistence';
import { clearSessionStorage } from './session-storage';

/**
 * Sign out and purge everything the previous user left on the device: the Supabase session,
 * the in-memory query cache, the encrypted session entries and AES key, and the persisted cache.
 *
 * The in-memory cache is cleared before the persisted steps, and each persisted step runs
 * even if an earlier one fails. A purge failure is logged, not thrown. A sign-out failure is
 * rethrown once the purge has run, so a purge error never replaces it.
 */
export async function signOutAndPurge(
  client: SupabaseClient,
  queryClient: QueryClient
): Promise<void> {
  let signOutFailed = false;
  let signOutError: unknown;
  try {
    await queryClient.cancelQueries();
    // Local scope clears this device only and does not depend on the network.
    await client.auth.signOut({ scope: 'local' });
  } catch (error) {
    signOutFailed = true;
    signOutError = error;
  }

  queryClient.clear();
  await purgeStep('session storage', clearSessionStorage);
  await purgeStep('persisted query cache', clearPersistedQueries);

  if (signOutFailed) {
    throw signOutError;
  }
}

/** Runs one purge step and logs its failure, so the steps after it still run. */
async function purgeStep(name: string, step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (error) {
    console.error(`Logout purge failed (${name}):`, error);
  }
}
