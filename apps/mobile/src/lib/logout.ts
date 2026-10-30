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
 * rethrown as an Error once the purge has run, so a purge error never replaces it. The caller
 * logs it.
 */
export async function signOutAndPurge(
  client: SupabaseClient,
  queryClient: QueryClient
): Promise<void> {
  let signOutFailed = false;
  let signOutError: unknown;
  try {
    await queryClient.cancelQueries();
    // Scope 'local' still sends POST /logout?scope=local when a session exists. auth-js removes
    // the local session even when that request fails, and reports the failure as { error }.
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      signOutFailed = true;
      signOutError = error;
    }
  } catch (error) {
    signOutFailed = true;
    signOutError = error;
  }

  await purgeStep('in-memory query cache', () => {
    queryClient.clear();
  });
  await purgeStep('session storage', clearSessionStorage);
  await purgeStep('persisted query cache', clearPersistedQueries);

  if (signOutFailed) {
    throw signOutError instanceof Error ? signOutError : new Error(String(signOutError));
  }
}

/** Runs one purge step and logs its failure, so the steps after it still run. */
async function purgeStep(name: string, step: () => void | Promise<void>): Promise<void> {
  try {
    await step();
  } catch (error) {
    console.error(`Logout purge failed (${name}):`, error);
  }
}
