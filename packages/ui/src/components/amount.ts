import { StyleSheet } from 'react-native';
import { brandFonts } from '../theme/brand';

/** Size presets shared by the Points and Price amount components. */
export type AmountSize = 'sm' | 'md' | 'lg';

export const amountStyles = StyleSheet.create({
  base: {
    fontFamily: brandFonts.heading,
    fontWeight: '600',
  },
  sm: { fontSize: 13, lineHeight: 18 },
  md: { fontSize: 16, lineHeight: 22 },
  lg: { fontSize: 28, lineHeight: 34 },
});
