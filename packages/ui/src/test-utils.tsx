import React from 'react';
import { render } from '@testing-library/react-native';
import { TamaguiProvider, Theme } from '@tamagui/core';
import { tamaguiConfig } from './tamagui.config';

export type TestScheme = 'light' | 'dark';

/** Renders UI inside the Tamagui provider and theme, as the app does at runtime. */
export function renderWithTheme(ui: React.ReactElement, scheme: TestScheme = 'light') {
  return render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme={scheme}>
      <Theme name={scheme}>{ui}</Theme>
    </TamaguiProvider>
  );
}
