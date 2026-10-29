import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useAppColors } from './theme/hooks';

interface ButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  /** Blocks presses and exposes the disabled state to assistive tech. Defaults to false. */
  disabled?: boolean;
  /** Spoken label for screen readers. Defaults to `title`. */
  accessibilityLabel?: string;
  /** Optional extra spoken context about what pressing does. */
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  style,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const colors = useAppColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
        style,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color: colors.primaryForeground }]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
