import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { Button } from './Button';
import { darkTheme, lightTheme } from './theme/brand';
import { renderWithTheme } from './test-utils';

describe('Button', () => {
  it('renders correctly with title', () => {
    const { getByText } = renderWithTheme(<Button title="Press me" onPress={jest.fn()} />);
    expect(getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(<Button title="Press me" onPress={onPress} />);
    fireEvent.press(getByText('Press me'));
    expect(onPress).toHaveBeenCalled();
  });

  it('takes its fill colour from the primary semantic token, switching on press', () => {
    const { UNSAFE_getByType } = renderWithTheme(<Button title="Press me" onPress={jest.fn()} />);
    const pressable = UNSAFE_getByType(Pressable);
    const style = (pressed: boolean): object =>
      StyleSheet.flatten(pressable.props.style({ pressed }));
    expect(style(false)).toMatchObject({ backgroundColor: lightTheme.primary });
    expect(style(true)).toMatchObject({ backgroundColor: lightTheme.primaryPressed });
  });

  it('takes its label colour from the light semantic theme', () => {
    const { getByText } = renderWithTheme(<Button title="Press me" onPress={jest.fn()} />, 'light');
    expect(StyleSheet.flatten(getByText('Press me').props.style)).toMatchObject({
      color: lightTheme.primaryForeground,
    });
  });

  it('takes its label colour from the dark semantic theme', () => {
    const { getByText } = renderWithTheme(<Button title="Press me" onPress={jest.fn()} />, 'dark');
    expect(StyleSheet.flatten(getByText('Press me').props.style)).toMatchObject({
      color: darkTheme.primaryForeground,
    });
  });

  it('is exposed to assistive tech as a button labelled by its title', () => {
    const { getByRole } = renderWithTheme(<Button title="Press me" onPress={jest.fn()} />);
    expect(getByRole('button', { name: 'Press me' })).toBeTruthy();
  });

  it('uses accessibilityLabel instead of the title when provided', () => {
    const { getByRole } = renderWithTheme(
      <Button title="⇄" accessibilityLabel="Swap languages" onPress={jest.fn()} />
    );
    expect(getByRole('button', { name: 'Swap languages' })).toBeTruthy();
  });

  it('exposes the enabled state to assistive tech by default', () => {
    const { getByRole } = renderWithTheme(<Button title="Press me" onPress={jest.fn()} />);
    expect(getByRole('button', { name: 'Press me', disabled: false })).toBeTruthy();
  });

  it('exposes the disabled state to assistive tech when disabled', () => {
    const { getByRole } = renderWithTheme(<Button title="Press me" disabled onPress={jest.fn()} />);
    expect(getByRole('button', { name: 'Press me', disabled: true })).toBeTruthy();
  });

  it('does not call onPress while disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(<Button title="Press me" disabled onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Press me' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('passes accessibilityHint through to the button', () => {
    const { getByRole } = renderWithTheme(
      <Button title="Add" accessibilityHint="Adds one item to your order" onPress={jest.fn()} />
    );
    expect(getByRole('button', { name: 'Add' }).props.accessibilityHint).toBe(
      'Adds one item to your order'
    );
  });
});
