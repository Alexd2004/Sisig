import { useEffect, useRef } from 'react';
import { Stack, router, useGlobalSearchParams, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SessionProvider, useSession, type SessionStatus } from '../src/session/session';
import { resolveAuthRedirect } from '../src/navigation/auth-gate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout(): JSX.Element {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator(): JSX.Element | null {
  const { status } = useSession();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const previousStatus = useRef<SessionStatus>(status);

  // The navigator mounts only once the session is known, so no stack flashes on cold start.
  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    SplashScreen.hideAsync().catch((error: unknown) => {
      console.error('Failed to hide splash screen:', error);
    });
  }, [status]);

  // Signing out clears every stack and shows the auth stack.
  useEffect(() => {
    const wasSignedIn = previousStatus.current === 'signed-in';
    previousStatus.current = status;

    if (wasSignedIn && status === 'signed-out') {
      router.dismissAll();
      router.replace('/welcome');
    }
  }, [status]);

  const redirectTo = resolveAuthRedirect({ status, segments, returnTo: params.returnTo });

  useEffect(() => {
    if (redirectTo !== null) {
      router.replace(redirectTo);
    }
  }, [redirectTo]);

  if (status === 'loading') {
    return null;
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
