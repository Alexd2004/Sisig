import React from 'react';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';
import { Text } from '../Text';
import { formatPrice } from '../format/format';
import { brandFonts } from '../theme/brand';
import { AmountSize, amountStyles } from './amount';

export interface PriceProps {
  /** Integer cents in CAD, for example 1499 for $14.99. */
  cents: number;
  /** Defaults to `md`. */
  size?: AmountSize;
  /** Show as a struck-through previous price, announced as 'Was $14.99'. */
  strikethrough?: boolean;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

/** Price in Canadian dollars, for example '$14.99'. */
export function Price({
  cents,
  size = 'md',
  strikethrough = false,
  style,
  testID,
}: PriceProps): JSX.Element {
  const text = formatPrice(cents);
  return (
    <Text
      testID={testID}
      tone={strikethrough ? 'muted' : 'default'}
      accessibilityLabel={strikethrough ? `Was ${text}` : text}
      style={[amountStyles.base, amountStyles[size], strikethrough && styles.struck, style]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  struck: {
    fontFamily: brandFonts.body,
    fontWeight: '400',
    textDecorationLine: 'line-through',
  },
});
