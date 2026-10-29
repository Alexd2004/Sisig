import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useAppColors } from './theme/hooks';

interface ButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({ onPress, title, style }) => {
  const colors = useAppColors();
  return (
    <Pressable
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
