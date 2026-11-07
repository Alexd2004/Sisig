import React from 'react';
import {
  Pressable,
  Switch as RNSwitch,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { DISABLED_OPACITY, MIN_TOUCH_TARGET } from '../a11y';
import { Text } from '../Text';
import { useAppColors } from '../theme/hooks';

export interface SwitchProps {
  label: string;
  /** Secondary text under the label; also used as the accessibility hint. */
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Labelled on/off row. The whole row (at least 44pt tall) is one accessible
 * switch, so tapping the label toggles it and screen readers read the label
 * and state together. The native switch inside is visual only.
 */
export function Switch({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  style,
  testID,
}: SwitchProps): JSX.Element {
  const colors = useAppColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.row, disabled && styles.disabled, style]}
    >
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {description !== undefined && (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        )}
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <RNSwitch
          value={value}
          disabled={disabled}
          trackColor={{ false: colors.foregroundMuted, true: colors.primary }}
          ios_backgroundColor={colors.foregroundMuted}
          thumbColor={colors.surface}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});
