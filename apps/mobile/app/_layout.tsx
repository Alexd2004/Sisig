import { useEffect, useRef } from 'react';
import { Stack, router, useGlobalSearchParams, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { AppThemeProvider } from '../src/components/AppThemeProvider';
import { SessionProvider, useSession, type SessionStatus } from '../src/session/session';
import { resolveAuthRedirect } from '../src/navigation/auth-gate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout(): JSX.Element {
  return (
    <AppThemeProvider>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </AppThemeProvider>
  );
}

function RootNavigator(): JSX.Element | null {
  const { status } = useSession();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const previousStatus = useRef<SessionStatus>(status);

  // Keys must match brandFonts in @sisig/ui. The splash screen stays up until the session
  // is known and the fonts have loaded, so the first visible frame already uses them.
  // If font loading fails we continue with the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  const isReady = status !== 'loading' && (fontsLoaded || fontError !== null);

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
  useEffect(() => {
    const wasSignedIn = previousStatus.current === 'signed-in';
    previousStatus.current = status;

    if (wasSignedIn && status === 'signed-out') {
      router.dismissAll();
      router.replace('/welcome');
    }
  }, [status]);

  const redirectTo = resolveAuthRedirect({ status, segments, returnTo: params.returnTo });

  // Redirects wait for isReady so no navigation runs before the navigator is mounted.
  useEffect(() => {
    if (isReady && redirectTo !== null) {
      router.replace(redirectTo);
    }
  }, [isReady, redirectTo]);

  if (!isReady) {
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
