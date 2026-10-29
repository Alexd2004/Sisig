import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppStateStatus } from 'react-native';

/** The part of React Native's AppState this module uses. Injectable for tests. */
export interface AppStateSource {
  readonly currentState: AppStateStatus;
  addEventListener(
    type: 'change',
    listener: (status: AppStateStatus) => void
  ): { remove: () => void };
}

/**
 * Run Supabase token auto-refresh only while the app is in the foreground.
 * Background timers are unreliable, so refresh stops on background/inactive and restarts on active.
 * An access token that expired while the app was backgrounded is still refreshed on the next
 * request, because supabase-js refreshes an expired session when it reads it.
 *
 * Returns a cleanup function that removes the listener and stops refresh.
 */
export function attachSessionLifecycle(
  client: SupabaseClient,
  appState: AppStateSource
): () => void {
  const apply = (status: AppStateStatus): void => {
    if (status === 'active') {
      void client.auth.startAutoRefresh();
    } else {
      void client.auth.stopAutoRefresh();
    }
  };

  apply(appState.currentState);
  const subscription = appState.addEventListener('change', apply);

  return () => {
    subscription.remove();
    void client.auth.stopAutoRefresh();
  };
}
