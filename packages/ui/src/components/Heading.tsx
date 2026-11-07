import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import { Text, TextProps } from '../Text';
import { brandFonts } from '../theme/brand';

export type HeadingLevel = 1 | 2 | 3;

export interface HeadingProps extends Omit<TextProps, 'variant'> {
  /** 1 is the screen title, 2 a section, 3 a group or card title. Defaults to 1. */
  level?: HeadingLevel;
}

/** Heading text in the brand heading font, announced as a header by screen readers. */
export const Heading = React.forwardRef<RNText, HeadingProps>(function Heading(
  { level = 1, style, ...rest },
  ref
) {
  return (
    <Text
      ref={ref}
      accessibilityRole="header"
      {...rest}
      style={[styles.base, LEVEL_STYLES[level], style]}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    fontFamily: brandFonts.heading,
    fontWeight: '600',
  },
});

const LEVEL_STYLES = StyleSheet.create({
  1: { fontSize: 28, lineHeight: 34 },
  2: { fontSize: 22, lineHeight: 28 },
  3: { fontSize: 18, lineHeight: 24 },
});
