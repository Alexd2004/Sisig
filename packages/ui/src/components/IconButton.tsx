import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { DISABLED_OPACITY, hitSlopFor, MIN_TOUCH_TARGET, PRESSED_OPACITY } from '../a11y';
import { AppColors, useAppColors } from '../theme/hooks';
import { PressHandler, usePressGuard } from '../usePressGuard';

export type IconButtonVariant = 'ghost' | 'secondary';

export interface IconButtonProps {
  /**
   * The icon element, for example an @expo/vector-icons glyph. The button is one
   * accessibility element, so the icon is not focused on its own.
   */
  icon: React.ReactNode;
  /** Required: an icon has no text, so this is what screen readers say. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** If it returns a promise, the button shows a spinner and ignores presses until it settles. */
  onPress: PressHandler;
  /** Defaults to `ghost`. */
  variant?: IconButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Visual size in pt. Defaults to 44. Smaller sizes keep a 44pt hit area through hitSlop. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const variantStyle = (
  colors: AppColors,
  variant: IconButtonVariant,
  pressed: boolean
): ViewStyle =>
  variant === 'secondary'
    ? {
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
        borderWidth: 1,
        // foregroundMuted, not the decorative border token, so the edge meets WCAG 1.4.11 (3:1).
        borderColor: colors.foregroundMuted,
      }
    : { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' };

export function IconButton({
  icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  variant = 'ghost',
  disabled = false,
  loading = false,
  size = MIN_TOUCH_TARGET,
  style,
  testID,
}: IconButtonProps): JSX.Element {
  const colors = useAppColors();
  const { pending, handlePress } = usePressGuard(onPress);
  const busy = loading || pending;
  const inactive = disabled || busy;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      hitSlop={hitSlopFor(size)}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variantStyle(colors, variant, pressed),
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={colors.primary} /> : icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});
