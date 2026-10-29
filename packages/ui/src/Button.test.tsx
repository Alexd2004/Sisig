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
});
