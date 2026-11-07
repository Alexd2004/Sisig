import React from 'react';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { act, render } from '@testing-library/react-native';
import { TamaguiProvider, Theme } from '@tamagui/core';
import { tamaguiConfig } from './tamagui.config';

export type TestScheme = 'light' | 'dark';

/**
 * Renders UI inside the Tamagui provider and theme, as the app does at runtime.
 * The providers are a wrapper, so `rerender` keeps them.
 */
export function renderWithTheme(ui: React.ReactElement, scheme: TestScheme = 'light') {
  function ThemeWrapper({ children }: { children: React.ReactNode }): JSX.Element {
    return (
      <TamaguiProvider config={tamaguiConfig} defaultTheme={scheme}>
        <Theme name={scheme}>{children}</Theme>
      </TamaguiProvider>
    );
  }
  return render(ui, { wrapper: ThemeWrapper });
}

/**
 * Settles pending promise callbacks inside act. React Native's Jest setup
 * replaces Promise with a polyfill that schedules callbacks with setImmediate,
 * so a chain such as `.finally` needs a few event-loop turns, not a microtask.
 */
export async function settlePromises(): Promise<void> {
  await act(async () => {
    for (let turn = 0; turn < 5; turn += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  });
}

/** Non-test .ts/.tsx files under `dir`, recursively (for source-scanning tests). */
export function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return listSourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}
