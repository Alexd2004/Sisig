import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { AppThemeProvider } from '../src/components/AppThemeProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout(): JSX.Element {
  const [isSessionRestored, setIsSessionRestored] = useState(false);

  // Keys must match brandFonts in @sisig/ui. The splash screen stays up until the
  // fonts load, so the first visible frame already uses them. If loading fails we
  // continue with the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  const isReady = isSessionRestored && (fontsLoaded || fontError !== null);

  useEffect(() => {
    // Simulate session restoration
    // In production, check Supabase auth state and restore session
    const restoreSession = async (): Promise<void> => {
      try {
        // TODO: Restore session from SecureStore / Supabase
        // const session = await supabase.auth.getSession();
        // setSession(session?.session ?? null);
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsSessionRestored(true);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <AppThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppThemeProvider>
    );
  }

  // TODO: Gate between auth stack and tabs based on session state
  return (
    <AppThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
      </Stack>
    </AppThemeProvider>
  );
}
