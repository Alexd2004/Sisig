import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { DISABLED_OPACITY, MIN_TOUCH_TARGET, PRESSED_OPACITY } from '../a11y';
import { Text } from '../Text';
import { AppColors, useThemedStyles } from '../theme/hooks';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Element before the text, for example an icon or avatar. */
  leading?: React.ReactNode;
  /**
   * Element after the text, for example a Badge, Points or a chevron. When the
   * row has `onPress` it is one accessible button, so leading and trailing
   * content must not be interactive (screen readers cannot reach it).
   */
  trailing?: React.ReactNode;
  /**
   * Spoken form of meaningful trailing content, for example '1,250 points' or
   * 'Ready'. The row is one accessible element, so trailing content is silent
   * unless it is described here. Leave it out for decorative trailing content.
   */
  trailingAccessibilityLabel?: string;
  /** Makes the row a button. */
  onPress?: () => void;
  disabled?: boolean;
  /** Spoken label. Defaults to the title, subtitle and trailingAccessibilityLabel. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** A list row with optional leading and trailing slots. At least 44pt tall. */
export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  trailingAccessibilityLabel,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ListItemProps): JSX.Element {
  const styles = useThemedStyles(createStyles);
  const label =
    accessibilityLabel ??
    [title, subtitle, trailingAccessibilityLabel].filter((part) => part).join(', ');

  const body = (
    <>
      {leading !== undefined && <View style={styles.leading}>{leading}</View>}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined && (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        )}
      </View>
      {trailing !== undefined && <View style={styles.trailing}>{trailing}</View>}
    </>
  );

  if (!onPress) {
    return (
      <View testID={testID} accessible accessibilityLabel={label} style={[styles.row, style]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: MIN_TOUCH_TARGET,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
    },
    leading: {
      marginRight: 12,
    },
    text: {
      flex: 1,
    },
    title: {
      fontSize: 16,
    },
    trailing: {
      marginLeft: 12,
    },
    pressed: {
      backgroundColor: colors.surfaceMuted,
      opacity: PRESSED_OPACITY,
    },
    disabled: {
      opacity: DISABLED_OPACITY,
    },
  });
