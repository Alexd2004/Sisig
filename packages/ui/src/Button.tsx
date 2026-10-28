import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({ onPress, title, style }) => (
  <Pressable style={[styles.button, style]} onPress={onPress}>
    <Text style={styles.text}>{title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
