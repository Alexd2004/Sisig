import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text as RNText } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { MIN_TOUCH_TARGET } from '../a11y';
import { darkTheme, lightTheme } from '../theme/brand';
import { renderWithTheme } from '../test-utils';
import { Checkbox } from './Checkbox';
import { FormField } from './FormField';
import { Input } from './Input';
import { INPUT_PRESETS } from './inputPresets';
import { Switch } from './Switch';
import { TextArea } from './TextArea';

const originalPlatformOS = Object.getOwnPropertyDescriptor(Platform, 'OS');

const setPlatform = (os: 'ios' | 'android'): void => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
};

afterAll(() => {
  if (originalPlatformOS) {
    Object.defineProperty(Platform, 'OS', originalPlatformOS);
  }
  jest.restoreAllMocks();
});

describe('Input presets', () => {
  it.each([
    [
      'email',
      {
        keyboardType: 'email-address',
        textContentType: 'emailAddress',
        autoComplete: 'email',
        autoCapitalize: 'none',
      },
    ],
    [
      'password',
      {
        secureTextEntry: true,
        textContentType: 'password',
        autoComplete: 'current-password',
      },
    ],
    [
      'newPassword',
      {
        secureTextEntry: true,
        textContentType: 'newPassword',
        autoComplete: 'new-password',
      },
    ],
    [
      'oneTimeCode',
      {
        keyboardType: 'number-pad',
        textContentType: 'oneTimeCode',
        autoComplete: 'one-time-code',
      },
    ],
    [
      'phone',
      {
        keyboardType: 'phone-pad',
        textContentType: 'telephoneNumber',
        autoComplete: 'tel',
      },
    ],
  ] as const)('%s sets the keyboard, autofill hint and secure entry', (preset, expected) => {
    expect(INPUT_PRESETS[preset]).toMatchObject(expected);
    const { getByPlaceholderText } = renderWithTheme(<Input preset={preset} placeholder="field" />);
    expect(getByPlaceholderText('field').props).toMatchObject(expected);
  });

  it('lets explicit props override the preset', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <Input preset="password" secureTextEntry={false} placeholder="field" />
    );
    expect(getByPlaceholderText('field').props.secureTextEntry).toBe(false);
  });

  it('is plain text by default', () => {
    const { getByPlaceholderText } = renderWithTheme(<Input placeholder="field" />);
    expect(getByPlaceholderText('field').props.secureTextEntry).toBeUndefined();
  });
});

describe('Input', () => {
  it('is at least 44pt tall and shows focus and error borders from tokens', () => {
    const { getByPlaceholderText, rerender } = renderWithTheme(<Input placeholder="field" />);
    expect(StyleSheet.flatten(getByPlaceholderText('field').props.style)).toMatchObject({
      minHeight: MIN_TOUCH_TARGET,
      borderColor: lightTheme.foregroundMuted,
    });
    fireEvent(getByPlaceholderText('field'), 'focus');
    expect(StyleSheet.flatten(getByPlaceholderText('field').props.style)).toMatchObject({
      borderColor: lightTheme.primary,
    });
    rerender(<Input placeholder="field" invalid />);
    expect(StyleSheet.flatten(getByPlaceholderText('field').props.style)).toMatchObject({
      borderColor: lightTheme.danger,
    });
  });

  it('still calls caller focus and blur handlers', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <Input placeholder="field" onFocus={onFocus} onBlur={onBlur} />
    );
    fireEvent(getByPlaceholderText('field'), 'focus');
    fireEvent(getByPlaceholderText('field'), 'blur');
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
  });

  it('exposes the disabled state and stops editing', () => {
    const { getByPlaceholderText } = renderWithTheme(<Input placeholder="field" disabled />);
    const input = getByPlaceholderText('field');
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('lets disabled win over an explicit editable and keeps caller accessibility state', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <Input placeholder="field" disabled editable accessibilityState={{ busy: true }} />
    );
    const input = getByPlaceholderText('field');
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toEqual({ busy: true, disabled: true });
  });

  it('treats editable={false} as disabled for assistive tech', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <Input placeholder="field" editable={false} />
    );
    expect(getByPlaceholderText('field').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('TextArea is multi-line and taller', () => {
    const { getByPlaceholderText } = renderWithTheme(<TextArea placeholder="notes" />);
    const area = getByPlaceholderText('notes');
    expect(area.props.multiline).toBe(true);
    expect(area.props.numberOfLines).toBe(4);
    expect(StyleSheet.flatten(area.props.style)).toMatchObject({
      minHeight: 96,
    });
  });
});

describe('FormField', () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

  beforeEach(() => {
    announce.mockClear();
    setPlatform('ios');
  });

  it('labels the control and passes the helper as its hint', () => {
    const { getByLabelText, getByText } = renderWithTheme(
      <FormField label="Email" helper="We send your receipt here">
        <Input preset="email" />
      </FormField>
    );
    const input = getByLabelText('Email');
    expect(input.props.accessibilityHint).toBe('We send your receipt here');
    expect(getByText('We send your receipt here', { includeHiddenElements: true })).toBeTruthy();
  });

  it('marks required fields in the visible and spoken label', () => {
    const { getByLabelText } = renderWithTheme(
      <FormField label="Name" required>
        <Input />
      </FormField>
    );
    expect(getByLabelText('Name (required)')).toBeTruthy();
  });

  it('shows the error inline as an alert in a polite live region and marks the input invalid', () => {
    const { getByRole, getByLabelText, getByTestId } = renderWithTheme(
      <FormField label="Email" error="Enter a valid email" testID="email">
        <Input preset="email" />
      </FormField>,
      'dark'
    );
    const alert = getByRole('alert');
    expect(alert.props.children).toBe('Enter a valid email');
    expect(StyleSheet.flatten(alert.props.style)).toMatchObject({
      color: darkTheme.danger,
    });
    expect(getByTestId('email-error').props.accessibilityLiveRegion).toBe('polite');
    const input = getByLabelText('Email. Error: Enter a valid email');
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({
      borderColor: darkTheme.danger,
    });
  });

  it('keeps the live region mounted with no error so Android announces the first error', () => {
    const { getByTestId, queryByRole } = renderWithTheme(
      <FormField label="Email" testID="email">
        <Input />
      </FormField>
    );
    expect(getByTestId('email-error').props.accessibilityLiveRegion).toBe('polite');
    expect(queryByRole('alert')).toBeNull();
  });

  it('announces a new error on iOS once, again when it changes, and not when cleared', () => {
    const field = (error?: string) => (
      <FormField label="Email" error={error}>
        <Input />
      </FormField>
    );
    const { rerender } = renderWithTheme(field());
    expect(announce).not.toHaveBeenCalled();

    rerender(field('Enter your email'));
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('Enter your email');

    rerender(field('Enter your email'));
    expect(announce).toHaveBeenCalledTimes(1);

    rerender(field('Enter a valid email'));
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith('Enter a valid email');

    rerender(field(undefined));
    rerender(field('Enter a valid email'));
    expect(announce).toHaveBeenCalledTimes(3);
  });

  it('leaves Android announcements to the live region (no double announcement)', () => {
    setPlatform('android');
    renderWithTheme(
      <FormField label="Email" error="Enter your email">
        <Input />
      </FormField>
    );
    expect(announce).not.toHaveBeenCalled();
  });

  it('keeps a label the control sets itself and still appends the error', () => {
    const field = (error?: string) => (
      <FormField label="Code" helper="Sent by SMS" error={error}>
        <Input
          preset="oneTimeCode"
          accessibilityLabel="Six digit code"
          accessibilityHint={undefined}
        />
      </FormField>
    );
    const { getByLabelText, rerender } = renderWithTheme(field());
    // An explicit undefined does not erase the field's helper hint.
    expect(getByLabelText('Six digit code').props.accessibilityHint).toBe('Sent by SMS');
    rerender(field('Code expired'));
    expect(getByLabelText('Six digit code. Error: Code expired')).toBeTruthy();
  });

  it('accepts a render function for hand-wired controls', () => {
    const { getByLabelText } = renderWithTheme(
      <FormField label="Notes" error="Too long">
        {(control) => <TextArea {...control} />}
      </FormField>
    );
    expect(getByLabelText('Notes. Error: Too long').props.multiline).toBe(true);
  });
});

describe('Switch', () => {
  it('is one 44pt switch row with role, label and checked state', () => {
    const onValueChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <Switch
        label="Promotions"
        description="Offers by push"
        value={false}
        onValueChange={onValueChange}
      />
    );
    const row = getByRole('switch', { name: 'Promotions', checked: false });
    expect(row.props.accessibilityHint).toBe('Offers by push');
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      minHeight: MIN_TOUCH_TARGET,
    });
    fireEvent.press(row);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('exposes and enforces the disabled state', () => {
    const onValueChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <Switch label="Promotions" value onValueChange={onValueChange} disabled />
    );
    fireEvent.press(
      getByRole('switch', {
        name: 'Promotions',
        checked: true,
        disabled: true,
      })
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('is one 44pt checkbox row that toggles', () => {
    const onValueChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <Checkbox label="I agree to the terms" checked={false} onValueChange={onValueChange} />
    );
    const row = getByRole('checkbox', {
      name: 'I agree to the terms',
      checked: false,
    });
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      minHeight: MIN_TOUCH_TARGET,
    });
    fireEvent.press(row);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('uses the explicit label for a rich consent label', () => {
    const { getByRole } = renderWithTheme(
      <Checkbox
        label={
          <RNText>
            I agree to the <RNText>terms</RNText>
          </RNText>
        }
        accessibilityLabel="I agree to the terms"
        checked
        onValueChange={jest.fn()}
      />
    );
    expect(getByRole('checkbox', { name: 'I agree to the terms', checked: true })).toBeTruthy();
  });

  it('exposes and enforces the disabled state', () => {
    const onValueChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <Checkbox label="Consent" checked={false} disabled onValueChange={onValueChange} />
    );
    fireEvent.press(getByRole('checkbox', { name: 'Consent', disabled: true }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('shows and announces a consent error', () => {
    setPlatform('ios');
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const { getByRole } = renderWithTheme(
      <Checkbox
        label="I agree to the terms"
        checked={false}
        error="Please accept the terms"
        onValueChange={jest.fn()}
      />
    );
    expect(getByRole('alert').props.children).toBe('Please accept the terms');
    expect(
      getByRole('checkbox', {
        name: 'I agree to the terms. Error: Please accept the terms',
      })
    ).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('Please accept the terms');
  });
});
