import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout(): JSX.Element {
  const [isSessionRestored, setIsSessionRestored] = useState(false);

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
        await SplashScreen.hideAsync();
      }
    };

    restoreSession();
  }, []);

  if (!isSessionRestored) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  // TODO: Gate between auth stack and tabs based on session state
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
    </Stack>
  );
}
