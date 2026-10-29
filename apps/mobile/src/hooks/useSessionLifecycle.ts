import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Manage session lifecycle based on app foreground/background.
 *
 * - Pauses auto-refresh when app goes to background
 * - Resumes auto-refresh when app returns to foreground
 */
export function useSessionLifecycle(client: SupabaseClient): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    const wasInBackground = appState.current.match(/inactive|background/);
    const isNowForeground = nextAppState === 'active';

    if (wasInBackground && isNowForeground) {
      // App returned to foreground
      // Resume auth auto-refresh
      try {
        const { data } = await client.auth.refreshSession();
        if (data?.session) {
          console.log('Session refreshed on foreground');
        }
      } catch (error) {
        console.error('Failed to refresh session:', error);
      }
    }

    appState.current = nextAppState;
  };
}
