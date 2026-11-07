import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { DISABLED_OPACITY, MIN_TOUCH_TARGET, PRESSED_OPACITY } from './a11y';
import { useHaptics } from './haptics/HapticsProvider';
import { AppColors, useAppColors } from './theme/hooks';
import { PressHandler, usePressGuard } from './usePressGuard';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps {
  /**
   * Press handler. If it returns a promise, the button shows its loading state
   * and ignores further presses until the promise settles. A rejection is not
   * swallowed, so catch inside the handler to show error UI.
   */
  onPress: PressHandler;
  title: string;
  /** Visual style. Defaults to `primary`. */
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  /** Blocks presses and exposes the disabled state to assistive tech. Defaults to false. */
  disabled?: boolean;
  /** Shows the loading state and blocks presses (for work the caller tracks itself). */
  loading?: boolean;
  /** Spoken label for screen readers. Defaults to `title`. */
  accessibilityLabel?: string;
  /** Optional extra spoken context about what pressing does. */
  accessibilityHint?: string;
  testID?: string;
}

interface VariantColors {
  background: string;
  pressedBackground: string;
  foreground: string;
  border?: string;
  /** Variants without a pressed token also dim while pressed. */
  dimOnPress: boolean;
}

const variantColors = (colors: AppColors, variant: ButtonVariant): VariantColors => {
  switch (variant) {
    case 'secondary':
      return {
        background: colors.surface,
        pressedBackground: colors.surfaceMuted,
        foreground: colors.primary,
        border: colors.primary,
        dimOnPress: true,
      };
    case 'ghost':
      return {
        background: 'transparent',
        pressedBackground: colors.surfaceMuted,
        foreground: colors.primary,
        dimOnPress: true,
      };
    case 'destructive':
      // There is no dangerPressed token, so only the dim shows the pressed state.
      return {
        background: colors.danger,
        pressedBackground: colors.danger,
        foreground: colors.dangerForeground,
        dimOnPress: true,
      };
    default:
      return {
        background: colors.primary,
        pressedBackground: colors.primaryPressed,
        foreground: colors.primaryForeground,
        dimOnPress: false,
      };
  }
};

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  style,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const colors = useAppColors();
  const haptics = useHaptics();
  // Light impact on primary actions only, per the haptics convention.
  const isPrimary = variant === 'primary';
  const onAccepted = useCallback(() => {
    if (isPrimary) {
      haptics.impactLight();
    }
  }, [isPrimary, haptics]);
  const { pending, handlePress } = usePressGuard(onPress, onAccepted);
  const busy = loading || pending;
  const inactive = disabled || busy;
  const palette = variantColors(colors, variant);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? palette.pressedBackground : palette.background,
        },
        palette.border !== undefined && {
          borderWidth: 1,
          borderColor: palette.border,
        },
        pressed && palette.dimOnPress && styles.dimmed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        {busy && (
          <ActivityIndicator
            testID={testID ? `${testID}-spinner` : undefined}
            size="small"
            color={palette.foreground}
            style={styles.spinner}
          />
        )}
        <Text style={[styles.text, { color: palette.foreground }]}>{title}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  dimmed: {
    opacity: PRESSED_OPACITY,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});
