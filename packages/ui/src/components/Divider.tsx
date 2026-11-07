import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useAppColors } from '../theme/hooks';

export interface DividerProps {
  /** Left inset in pt, for example to line up with list item text. Defaults to 0. */
  inset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Hairline separator. Decorative, so it is hidden from screen readers. */
export function Divider({ inset = 0, style, testID }: DividerProps): JSX.Element {
  const colors = useAppColors();
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.line, { backgroundColor: colors.border, marginLeft: inset }, style]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
