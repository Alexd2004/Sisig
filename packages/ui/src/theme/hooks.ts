import { useMemo } from 'react';
import { useTheme } from '@tamagui/core';
import { SEMANTIC_TOKENS, SemanticToken, SemanticTheme } from './brand';

export type AppColors = Readonly<SemanticTheme>;

/**
 * Resolved semantic colours for the active Tamagui theme (follows the OS
 * light/dark setting through the Theme provider in apps/mobile).
 */
export function useAppColors(): AppColors {
  const theme = useTheme();
  return useMemo(() => {
    const colors = {} as Record<SemanticToken, string>;
    for (const token of SEMANTIC_TOKENS) {
      colors[token] = theme[token].val;
    }
    return colors;
  }, [theme]);
}

/**
 * Builds styles from semantic colours. Pass a module-level factory, for example
 * `const createStyles = (c: AppColors) => StyleSheet.create({ ... })`, so the
 * styles are only rebuilt when the theme changes.
 */
export function useThemedStyles<T>(createStyles: (colors: AppColors) => T): T {
  const colors = useAppColors();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
