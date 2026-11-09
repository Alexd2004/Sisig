import { useEffect, useRef } from 'react';
import { Stack, router, useGlobalSearchParams, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AppThemeProvider } from '../src/components/AppThemeProvider';
import { ForcedUpdateScreen } from '../src/components/ForcedUpdateScreen';
import { RemoteConfigProvider, useRemoteConfig } from '../src/config/remote-config';
import { SessionProvider, useSession, type SessionStatus } from '../src/session/session';
import { createSupabaseSessionSource } from '../src/session/supabase-source';
import { persistOptions } from '../src/lib/query-persistence';
import { queryClient, supabase } from '../src/lib/supabase';
import { resolveAuthRedirect } from '../src/navigation/auth-gate';

SplashScreen.preventAutoHideAsync();

// Created once for the app's lifetime, so SessionProvider subscribes to Supabase once.
const sessionSource = createSupabaseSessionSource(supabase, queryClient);

export default function RootLayout(): JSX.Element {
  return (
    <AppThemeProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <RemoteConfigProvider client={supabase}>
          <SessionProvider source={sessionSource}>
            <RootNavigator />
          </SessionProvider>
        </RemoteConfigProvider>
      </PersistQueryClientProvider>
    </AppThemeProvider>
  );
}

function RootNavigator(): JSX.Element | null {
  const { status } = useSession();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const previousStatus = useRef<SessionStatus>(status);
  const remoteConfig = useRemoteConfig();
  const { updateGate } = remoteConfig;
  // Forced update (PLAT-06): shown instead of the navigator, so there is nothing to dismiss.
  const isBlocked = updateGate.status === 'blocked';

  // Keys must match brandFonts in @sisig/ui. The splash screen stays up until the session
  // is known, the fonts have loaded and the remote config has read its disk cache, so the
  // first visible frame already uses the fonts and a cached forced update shows straight away.
  // If font loading fails we continue with the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  const isReady =
    status !== 'loading' && (fontsLoaded || fontError !== null) && remoteConfig.isReady;

  // The navigator mounts only once the session and fonts are ready, so no stack flashes on cold start.
  useEffect(() => {
    if (!isReady) {
      return;
    }
    SplashScreen.hideAsync().catch((error: unknown) => {
      console.error('Failed to hide splash screen:', error);
    });
  }, [isReady]);

  // Signing out clears every stack and shows the auth stack.
  // Skipped while blocked: no navigator is mounted, and the stack restarts when unblocked.
  useEffect(() => {
    const wasSignedIn = previousStatus.current === 'signed-in';
    previousStatus.current = status;

    if (wasSignedIn && status === 'signed-out' && !isBlocked) {
      router.dismissAll();
      router.replace('/welcome');
    }
  }, [status, isBlocked]);

  const redirectTo = resolveAuthRedirect({ status, segments, returnTo: params.returnTo });

  // Redirects wait for isReady so no navigation runs before the navigator is mounted.
  useEffect(() => {
    if (isReady && !isBlocked && redirectTo !== null) {
      router.replace(redirectTo);
    }
  }, [isReady, isBlocked, redirectTo]);

  if (!isReady) {
    return null;
  }

  if (updateGate.status === 'blocked') {
    return <ForcedUpdateScreen storeUrl={updateGate.storeUrl} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
      <Stack.Screen
        name="redeem-confirm"
        options={{ presentation: 'modal', headerShown: true, title: 'Redeem' }}
      />
      <Stack.Screen
        name="item/[id]"
        options={{ presentation: 'modal', headerShown: true, title: 'Item' }}
      />
    </Stack>
  );
}
