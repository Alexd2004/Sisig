import React from 'react';
import { StyleSheet, TextInput as RNTextInput } from 'react-native';
import { Input, InputProps } from './Input';

export interface TextAreaProps extends Omit<InputProps, 'multiline' | 'preset'> {
  /** Visible rows before scrolling (Android). Defaults to 4. */
  numberOfLines?: number;
}

/** Multi-line text field for longer answers such as feedback or notes. */
export const TextArea = React.forwardRef<RNTextInput, TextAreaProps>(function TextArea(
  { numberOfLines = 4, style, ...rest },
  ref
) {
  return (
    <Input
      ref={ref}
      {...rest}
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      style={[styles.area, style]}
    />
  );
});

const styles = StyleSheet.create({
  area: {
    minHeight: 96,
  },
});
