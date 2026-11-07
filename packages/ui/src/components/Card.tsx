import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { DISABLED_OPACITY, MIN_TOUCH_TARGET, PRESSED_OPACITY } from '../a11y';
import { AppColors, useThemedStyles } from '../theme/hooks';

export type CardVariant = 'elevated' | 'muted';

interface CardBaseProps {
  children: React.ReactNode;
  /** `elevated` (default) is a bordered surface; `muted` is a flat, tinted panel. */
  variant?: CardVariant;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A pressable card is announced as one button, so its children are not read
 * on their own: `accessibilityLabel` is required with `onPress`.
 */
export type CardProps = CardBaseProps &
  (
    | { onPress?: undefined; accessibilityLabel?: string }
    | { onPress: () => void; accessibilityLabel: string }
  );

/** Surface container. Display-only unless `onPress` is given, then it is one accessible button. */
export function Card({
  children,
  variant = 'elevated',
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps): JSX.Element {
  const styles = useThemedStyles(createStyles);
  const base = [styles.card, variant === 'muted' ? styles.muted : styles.elevated];

  if (!onPress) {
    return (
      <View testID={testID} style={[base, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        styles.pressable,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 12,
      padding: 16,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    muted: {
      backgroundColor: colors.surfaceMuted,
    },
    pressable: {
      minHeight: MIN_TOUCH_TARGET,
      minWidth: MIN_TOUCH_TARGET,
    },
    pressed: {
      backgroundColor: colors.surfaceMuted,
      opacity: PRESSED_OPACITY,
    },
    disabled: {
      opacity: DISABLED_OPACITY,
    },
  });
