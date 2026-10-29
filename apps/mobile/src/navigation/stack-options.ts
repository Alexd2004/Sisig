import { useAppColors } from '@sisig/ui';

/**
 * Header styling for the per-tab Stacks. The tabs layout turns its own header off,
 * so each tab's Stack draws the header and takes its colours from the theme here.
 */
export function useStackScreenOptions(): {
  headerStyle: { backgroundColor: string };
  headerTintColor: string;
  headerTitleStyle: { color: string };
} {
  const colors = useAppColors();
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.foreground,
    headerTitleStyle: { color: colors.foreground },
  };
}
