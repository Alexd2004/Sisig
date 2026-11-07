import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { AppColors, useAppColors } from './theme/hooks';
import { brandFonts, FONT_SCALE_CAP } from './theme/brand';

export type TextVariant = 'body' | 'caption';
export type TextTone = 'default' | 'muted' | 'danger';

export interface TextProps extends RNTextProps {
  /** Size preset. `body` (default) keeps the platform default size; `caption` is small print. */
  variant?: TextVariant;
  /** Semantic colour. Defaults to the foreground colour. */
  tone?: TextTone;
}

const VARIANT_STYLES: Record<TextVariant, TextStyle | undefined> = {
  body: undefined,
  caption: { fontSize: 13, lineHeight: 18 },
};

const toneColor = (colors: AppColors, tone: TextTone): string => {
  switch (tone) {
    case 'muted':
      return colors.foregroundMuted;
    case 'danger':
      return colors.danger;
    default:
      return colors.foreground;
  }
};

/**
 * App text: brand body font, semantic foreground colour, and OS font scaling
 * capped at FONT_SCALE_CAP so key layouts keep their shape. Use this instead of
 * the react-native Text component in app code.
 */
export const Text = React.forwardRef<RNText, TextProps>(function Text(props, ref) {
  const colors = useAppColors();
  const { style, maxFontSizeMultiplier, variant = 'body', tone = 'default', ...rest } = props;
  return (
    <RNText
      ref={ref}
      {...rest}
      maxFontSizeMultiplier={Math.min(maxFontSizeMultiplier ?? FONT_SCALE_CAP, FONT_SCALE_CAP)}
      style={[
        { fontFamily: brandFonts.body, color: toneColor(colors, tone) },
        VARIANT_STYLES[variant],
        style,
      ]}
    />
  );
});
