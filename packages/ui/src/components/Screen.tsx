import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '../theme/hooks';

const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

export interface ScreenProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView. Defaults to true. */
  scroll?: boolean;
  /** Move content above the keyboard on iOS (Android resizes the window itself). Defaults to true. */
  keyboardAvoiding?: boolean;
  /**
   * Distance in pt between the top of the window and the top of this screen,
   * passed to KeyboardAvoidingView. Screens under a navigation header pass the
   * header height (for example from useHeaderHeight()) or the keyboard covers
   * the bottom of the content by that much on iOS. Defaults to 0.
   */
  keyboardVerticalOffset?: number;
  /**
   * Safe-area edges to inset. Defaults to all four. Screens under a navigation
   * header usually pass ['right', 'bottom', 'left'].
   */
  edges?: readonly Edge[];
  /** Apply the standard 16pt content padding. Defaults to true. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Screen container: themed background, safe-area insets, keyboard avoidance
 * and optional scrolling. The app root must provide a SafeAreaProvider
 * (expo-router's root does).
 */
export function Screen({
  children,
  scroll = true,
  keyboardAvoiding = true,
  keyboardVerticalOffset = 0,
  edges = ALL_EDGES,
  padded = true,
  style,
  contentContainerStyle,
  testID,
}: ScreenProps): JSX.Element {
  const colors = useAppColors();
  const contentStyle = [padded && styles.padded, contentContainerStyle];

  const content = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.grow, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      style={[styles.fill, { backgroundColor: colors.background }, style]}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
  padded: {
    padding: 16,
  },
});
