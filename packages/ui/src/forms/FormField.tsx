import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { FieldError } from './FieldError';

/** Props FormField passes to its control (for example an Input or TextArea). */
export interface FormFieldControlProps {
  accessibilityLabel: string;
  accessibilityHint?: string;
  invalid: boolean;
}

export interface FormFieldProps {
  label: string;
  /** Guidance shown under the control while there is no error. */
  helper?: string;
  /** Error shown under the control and announced by screen readers. */
  error?: string;
  /** Adds ' (required)' to the visible and spoken label. */
  required?: boolean;
  /**
   * The control. A single element (usually Input or TextArea) receives the
   * accessibility label, hint and `invalid` flag. A label or hint the element
   * sets itself is kept, and the current error is still appended to its label.
   * The element must be the control itself: if it is wrapped in a View, use the
   * function form and spread the props onto the control.
   */
  children: React.ReactElement | ((control: FormFieldControlProps) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Label, control, helper text and inline error.
 *
 * React Native has no cross-platform "label for" link, so the control itself
 * carries the label (and the current error) as its accessibility label, and
 * the visible label and helper are hidden from screen readers to avoid reading
 * them twice. The helper is spoken as the control's accessibility hint (users
 * who turn hints off do not hear it, so put anything essential in the label).
 * The error is announced through FieldError.
 */
export function FormField({
  label,
  helper,
  error,
  required = false,
  children,
  style,
  testID,
}: FormFieldProps): JSX.Element {
  const hasError = error !== undefined && error !== '';
  const visibleLabel = required ? `${label} (required)` : label;
  const withError = (spoken: string): string => (hasError ? `${spoken}. Error: ${error}` : spoken);

  let rendered: React.ReactNode;
  if (typeof children === 'function') {
    rendered = children({
      accessibilityLabel: withError(visibleLabel),
      accessibilityHint: helper,
      invalid: hasError,
    });
  } else {
    const own = children.props as Partial<FormFieldControlProps>;
    rendered = React.cloneElement(children, {
      accessibilityLabel: withError(own.accessibilityLabel || visibleLabel),
      accessibilityHint: own.accessibilityHint ?? helper,
      // The error state always comes from the field.
      invalid: hasError,
    });
  }

  return (
    <View testID={testID} style={[styles.field, style]}>
      <Text
        style={styles.label}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {visibleLabel}
      </Text>
      {rendered}
      {helper !== undefined && !hasError && (
        <Text
          variant="caption"
          tone="muted"
          style={styles.helper}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {helper}
        </Text>
      )}
      <FieldError message={error} testID={testID ? `${testID}-error` : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  helper: {
    marginTop: 4,
  },
});
