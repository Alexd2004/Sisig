import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { Text } from '../Text';

interface FieldErrorProps {
  /** The error text; nothing is shown when empty. */
  message?: string;
  testID?: string;
}

/**
 * Inline error text that screen readers announce when it appears or changes.
 *
 * - Android (TalkBack): the always-mounted container is a polite live region,
 *   so TalkBack reads the text when it is added or changes. The container must
 *   exist before the error does, which is why it renders even when empty.
 * - iOS (VoiceOver): live regions are Android-only and VoiceOver does not
 *   announce newly mounted views, so the message is announced explicitly with
 *   AccessibilityInfo.announceForAccessibility. This runs on iOS only, so
 *   TalkBack users do not hear it twice.
 *
 * The text also has the `alert` role so it is identified as an error when a
 * user reaches it by swiping.
 *
 * Known limit: when several fields fail in the same render (validate on
 * submit), each announces and VoiceOver only finishes the last one. A
 * form-level summary announcement is a follow-up for screens that need it.
 */
export function FieldError({ message, testID }: FieldErrorProps): JSX.Element {
  const announced = useRef<string | undefined>(undefined);
  const hasMessage = message !== undefined && message !== '';

  useEffect(() => {
    if (hasMessage && message !== announced.current && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(message);
    }
    announced.current = hasMessage ? message : undefined;
  }, [hasMessage, message]);

  return (
    <View testID={testID} accessibilityLiveRegion="polite">
      {hasMessage && (
        <Text variant="caption" tone="danger" accessibilityRole="alert" style={styles.text}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: 4,
  },
});
