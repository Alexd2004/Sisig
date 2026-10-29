import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { useAppColors } from './theme/hooks';
import { brandFonts, FONT_SCALE_CAP } from './theme/brand';

/**
 * App text input: brand body font, semantic text and placeholder colours, and OS
 * font scaling capped at FONT_SCALE_CAP. Use this instead of the react-native
 * TextInput component in app code.
 */
export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  function TextInput(props, ref) {
    const colors = useAppColors();
    const { style, maxFontSizeMultiplier, placeholderTextColor, ...rest } = props;
    return (
      <RNTextInput
        ref={ref}
        {...rest}
        placeholderTextColor={placeholderTextColor ?? colors.placeholder}
        maxFontSizeMultiplier={Math.min(maxFontSizeMultiplier ?? FONT_SCALE_CAP, FONT_SCALE_CAP)}
        style={[{ fontFamily: brandFonts.body, color: colors.foreground }, style]}
      />
    );
  }
);
