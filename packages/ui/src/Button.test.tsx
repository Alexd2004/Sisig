import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<Button title="Press me" onPress={jest.fn()} />);
    expect(getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Press me" onPress={onPress} />);
    fireEvent.press(getByText('Press me'));
    expect(onPress).toHaveBeenCalled();
  });
});
