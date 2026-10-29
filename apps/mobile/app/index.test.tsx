import { render, fireEvent } from '@testing-library/react-native';
import { TamaguiProvider, Theme, tamaguiConfig } from '@sisig/ui';
import HomeScreen from './index';

jest.mock('@sisig/api', () => ({
  apiUrl: () => 'http://localhost:3000',
}));

function renderHomeScreen(): ReturnType<typeof render> {
  return render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Theme name="light">
        <HomeScreen />
      </Theme>
    </TamaguiProvider>
  );
}

describe('HomeScreen', () => {
  it('renders welcome message', () => {
    const { getByText } = renderHomeScreen();
    expect(getByText('Welcome to Sisig')).toBeTruthy();
    expect(getByText('Mobile App')).toBeTruthy();
  });

  it('increments count when button is pressed', () => {
    const { getByText } = renderHomeScreen();
    const incrementButton = getByText('Increment');
    fireEvent.press(incrementButton);
    expect(getByText('Count: 1')).toBeTruthy();
  });
});
