import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Button } from '../Button';
import { Heading } from './Heading';

export interface SectionHeaderProps {
  title: string;
  /** Text of the optional trailing action, for example 'See all'. Shown only with onActionPress. */
  actionLabel?: string;
  onActionPress?: () => void;
  /** Spoken label for the action when its text alone is ambiguous, for example 'See all rewards'. */
  actionAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Section title (a level 2 header) with an optional ghost action button. */
export function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  actionAccessibilityLabel,
  style,
  testID,
}: SectionHeaderProps): JSX.Element {
  return (
    <View testID={testID} style={[styles.row, style]}>
      <Heading level={2} style={styles.title}>
        {title}
      </Heading>
      {actionLabel !== undefined && onActionPress !== undefined && (
        <Button
          variant="ghost"
          title={actionLabel}
          accessibilityLabel={actionAccessibilityLabel}
          onPress={onActionPress}
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  title: {
    flex: 1,
  },
  action: {
    paddingHorizontal: 12,
  },
});
