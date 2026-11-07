import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { AppColors, useAppColors } from '../theme/hooks';

/**
 * `accent` is for highlights such as 'New' and points; `success`, `warning` and
 * `danger` are statuses; `neutral` is everything else.
 */
export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  label: string;
  /** Defaults to `neutral`. */
  tone?: BadgeTone;
  /** Spoken label when the visible text is abbreviated (for example 'pts'). Defaults to `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const toneColors = (colors: AppColors, tone: BadgeTone): { bg: string; fg: string } => {
  switch (tone) {
    case 'accent':
      return { bg: colors.accent, fg: colors.accentForeground };
    case 'success':
      return { bg: colors.success, fg: colors.successForeground };
    case 'warning':
      return { bg: colors.warning, fg: colors.warningForeground };
    case 'danger':
      return { bg: colors.danger, fg: colors.dangerForeground };
    default:
      return { bg: colors.surfaceMuted, fg: colors.foreground };
  }
};

/** Small display-only label: points, 'New' or a status. Not interactive. */
export function Badge({
  label,
  tone = 'neutral',
  accessibilityLabel,
  style,
  testID,
}: BadgeProps): JSX.Element {
  const colors = useAppColors();
  const { bg, fg } = toneColors(colors, tone);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.badge, { backgroundColor: bg }, style]}
    >
      <Text variant="caption" style={[styles.text, { color: fg }]}>
        {label}
      </Text>
    </View>
  );
}

/** Alias of Badge; the ticket and designs call some of these chips. */
export const Chip = Badge;
export type ChipProps = BadgeProps;

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontWeight: '600',
  },
});
