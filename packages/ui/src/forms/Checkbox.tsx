import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { DISABLED_OPACITY, MIN_TOUCH_TARGET } from '../a11y';
import { Text } from '../Text';
import { AppColors, useThemedStyles } from '../theme/hooks';
import { FieldError } from './FieldError';

/**
 * A plain-text label is also the spoken label. A rich label (for example
 * consent text with bold terms) needs an explicit accessibilityLabel.
 * The row is a single accessible element, so links inside a rich label are not
 * reachable by screen readers on their own: put links next to the checkbox.
 */
type CheckboxLabel =
  | { label: string; accessibilityLabel?: string }
  | { label: React.ReactElement; accessibilityLabel: string };

export type CheckboxProps = CheckboxLabel & {
  checked: boolean;
  onValueChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Error shown under the row and announced, for example 'Please accept the terms'. */
  error?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const BOX_SIZE = 24;

/** Checkbox row for consent and opt-in toggles. The whole row is at least 44pt tall. */
export function Checkbox({
  label,
  accessibilityLabel,
  checked,
  onValueChange,
  disabled = false,
  error,
  accessibilityHint,
  style,
  testID,
}: CheckboxProps): JSX.Element {
  const styles = useThemedStyles(createStyles);
  const invalid = error !== undefined && error !== '';
  const spokenLabel = accessibilityLabel ?? (typeof label === 'string' ? label : '');

  return (
    <View style={style}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityLabel={invalid ? `${spokenLabel}. Error: ${error}` : spokenLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onValueChange(!checked)}
        style={[styles.row, disabled && styles.disabled]}
      >
        <View
          style={[
            styles.box,
            checked && styles.boxChecked,
            invalid && !checked && styles.boxInvalid,
          ]}
        >
          {checked && <View style={styles.tick} />}
        </View>
        <View style={styles.text}>
          {typeof label === 'string' ? <Text style={styles.label}>{label}</Text> : label}
        </View>
      </Pressable>
      <FieldError message={error} testID={testID ? `${testID}-error` : undefined} />
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: MIN_TOUCH_TARGET,
      paddingVertical: 8,
    },
    box: {
      width: BOX_SIZE,
      height: BOX_SIZE,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.foregroundMuted,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    boxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    boxInvalid: {
      borderColor: colors.danger,
    },
    // A check mark drawn as the bottom-right corner of a rotated box (no icon dependency).
    tick: {
      width: 7,
      height: 13,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderColor: colors.primaryForeground,
      transform: [{ rotate: '45deg' }],
      marginTop: -3,
    },
    text: {
      flex: 1,
    },
    label: {
      fontSize: 16,
    },
    disabled: {
      opacity: DISABLED_OPACITY,
    },
  });
