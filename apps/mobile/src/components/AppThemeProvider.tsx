import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Theme, TamaguiProvider, tamaguiConfig } from '@sisig/ui';

interface AppThemeProviderProps {
  children: ReactNode;
}

/**
 * Applies the Tamagui semantic theme and follows the OS light/dark setting.
 * useColorScheme re-renders on OS changes, so the theme switches while running.
 * There is no in-app override in v1.
 */
export function AppThemeProvider({ children }: AppThemeProviderProps): JSX.Element {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={scheme}>
      <Theme name={scheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </Theme>
    </TamaguiProvider>
  );
}
