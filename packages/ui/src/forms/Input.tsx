import React, { useState } from 'react';
import { StyleSheet, TextInput as RNTextInput, TextInputProps } from 'react-native';
import { DISABLED_OPACITY, MIN_TOUCH_TARGET } from '../a11y';
import { TextInput } from '../TextInput';
import { AppColors, useThemedStyles } from '../theme/hooks';
import { INPUT_PRESETS, InputPreset } from './inputPresets';

export interface InputProps extends TextInputProps {
  /** Keyboard, autofill and secure-entry preset. Defaults to `text`. Explicit props win. */
  preset?: InputPreset;
  /** Shows the error border. FormField sets this when it has an error. */
  invalid?: boolean;
  /** Not editable, dimmed, and exposed as disabled to assistive tech. */
  disabled?: boolean;
}

/** Single-line text field, at least 44pt tall, with a visible focus and error border. */
export const Input = React.forwardRef<RNTextInput, InputProps>(function Input(
  {
    preset = 'text',
    invalid = false,
    disabled = false,
    editable,
    accessibilityState,
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);
  // `disabled` always wins over `editable`, so the look, the announced state and
  // the behaviour cannot disagree.
  const inactive = disabled || editable === false;

  return (
    <TextInput
      ref={ref}
      {...INPUT_PRESETS[preset]}
      {...rest}
      editable={!inactive}
      accessibilityState={{ ...accessibilityState, disabled: inactive }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        focused && styles.focused,
        invalid && styles.invalid,
        inactive && styles.disabled,
        style,
      ]}
    />
  );
});

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    input: {
      minHeight: MIN_TOUCH_TARGET,
      borderWidth: 1,
      borderColor: colors.foregroundMuted,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      backgroundColor: colors.surface,
    },
    focused: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    invalid: {
      borderColor: colors.danger,
      borderWidth: 2,
    },
    disabled: {
      opacity: DISABLED_OPACITY,
    },
  });
