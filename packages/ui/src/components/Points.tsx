import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { formatPoints, formatPointsSpoken } from '../format/format';
import { AmountSize, amountStyles } from './amount';
import { Badge } from './Badge';

interface PointsBaseProps {
  /** Integer points. */
  value: number;
  testID?: string;
}

export type PointsProps = PointsBaseProps &
  (
    | {
        /** Plain text amount (the default). */
        badge?: false;
        /** Defaults to `md`. */
        size?: AmountSize;
        style?: StyleProp<TextStyle>;
      }
    | {
        /** Render as an accent Badge (for example on a reward card). */
        badge: true;
        size?: undefined;
        style?: StyleProp<ViewStyle>;
      }
  );

/**
 * Points amount, for example '1,250 pts'. Screen readers hear '1,250 points'
 * because the 'pts' abbreviation is read out letter by letter.
 */
export function Points(props: PointsProps): JSX.Element {
  const { value, testID } = props;
  const text = formatPoints(value);
  const spoken = formatPointsSpoken(value);

  if (props.badge) {
    return (
      <Badge
        testID={testID}
        tone="accent"
        label={text}
        accessibilityLabel={spoken}
        style={props.style}
      />
    );
  }

  return (
    <Text
      testID={testID}
      accessibilityLabel={spoken}
      style={[amountStyles.base, amountStyles[props.size ?? 'md'], props.style]}
    >
      {text}
    </Text>
  );
}
