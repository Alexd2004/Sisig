import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from './index';

jest.mock('@sisig/api', () => ({
  apiUrl: () => 'http://localhost:3000',
}));

describe('HomeScreen', () => {
  it('renders welcome message', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Welcome to Sisig')).toBeTruthy();
    expect(getByText('Mobile App')).toBeTruthy();
  });

  it('increments count when button is pressed', () => {
    const { getByText } = render(<HomeScreen />);
    const incrementButton = getByText('Increment');
    fireEvent.press(incrementButton);
    expect(getByText('Count: 1')).toBeTruthy();
  });
});
