import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import { signOutAndPurge } from '../lib/logout';
import type { ResolvedSessionStatus, SessionSource } from './session';

/**
 * The Supabase-backed SessionSource. It restores the session on start, reports every auth
 * change from supabase-js, and purges the device on sign-out.
 *
 * The purge runs for every SIGNED_OUT, not only for the app's own sign-out button, so a session
 * that ends elsewhere (for example a refresh token the server rejects) also clears the caches.
 */
export function createSupabaseSessionSource(
  client: SupabaseClient,
  queryClient: QueryClient
): SessionSource {
  // Sign-outs in progress. signOutAndPurge calls auth.signOut, and that emits SIGNED_OUT.
  // While a sign-out runs, the event must not start a second purge.
  let signOutsInFlight = 0;

  const endSession = (): Promise<void> => {
    signOutsInFlight += 1;
    return signOutAndPurge(client, queryClient).finally(() => {
      signOutsInFlight -= 1;
    });
  };

  return {
    restore: async (): Promise<ResolvedSessionStatus> => {
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw error;
      }
      return data.session ? 'signed-in' : 'signed-out';
    },

    subscribe: (listener) => {
      const { data } = client.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          if (event === 'SIGNED_OUT' && signOutsInFlight === 0) {
            endSession().catch((error: unknown) => {
              console.error('Purge after sign-out failed:', error);
            });
          }
          listener(session ? 'signed-in' : 'signed-out');
        }
      );

      return () => {
        data.subscription.unsubscribe();
      };
    },

    signOut: endSession,
  };
}
