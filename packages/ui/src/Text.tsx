import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useAppColors } from './theme/hooks';
import { brandFonts, FONT_SCALE_CAP } from './theme/brand';

/**
 * App text: brand body font, semantic foreground colour, and OS font scaling
 * capped at FONT_SCALE_CAP so key layouts keep their shape. Use this instead of
 * the react-native Text component in app code.
 */
export const Text = React.forwardRef<RNText, TextProps>(function Text(props, ref) {
  const colors = useAppColors();
  const { style, maxFontSizeMultiplier, ...rest } = props;
  return (
    <RNText
      ref={ref}
      {...rest}
      maxFontSizeMultiplier={Math.min(maxFontSizeMultiplier ?? FONT_SCALE_CAP, FONT_SCALE_CAP)}
      style={[{ fontFamily: brandFonts.body, color: colors.foreground }, style]}
    />
  );
});
