import { render } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { darkTheme, lightTheme, useAppColors } from '@sisig/ui';
import { AppThemeProvider } from './AppThemeProvider';

// Stands in for the OS appearance setting. Changing it and re-rendering is what
// happens when react-native's useColorScheme reports a new value.
let mockScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme,
}));

function BackgroundProbe(): JSX.Element {
  const colors = useAppColors();
  return <RNText testID="background">{colors.background}</RNText>;
}

describe('AppThemeProvider', () => {
  afterEach(() => {
    mockScheme = 'light';
  });

  it('applies the light semantic theme when the OS is in light mode', () => {
    const { getByTestId } = render(
      <AppThemeProvider>
        <BackgroundProbe />
      </AppThemeProvider>
    );
    expect(getByTestId('background').props.children).toBe(lightTheme.background);
  });

  it('applies the dark semantic theme when the OS is in dark mode', () => {
    mockScheme = 'dark';
    const { getByTestId } = render(
      <AppThemeProvider>
        <BackgroundProbe />
      </AppThemeProvider>
    );
    expect(getByTestId('background').props.children).toBe(darkTheme.background);
  });

  it('switches theme when the OS setting changes while mounted', () => {
    const { getByTestId, rerender } = render(
      <AppThemeProvider>
        <BackgroundProbe />
      </AppThemeProvider>
    );
    expect(getByTestId('background').props.children).toBe(lightTheme.background);

    mockScheme = 'dark';
    rerender(
      <AppThemeProvider>
        <BackgroundProbe />
      </AppThemeProvider>
    );
    expect(getByTestId('background').props.children).toBe(darkTheme.background);
  });
});
