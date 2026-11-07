import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { TamaguiProvider, Theme, tamaguiConfig } from '@sisig/ui';
import { SessionProvider, type SessionSource } from '../session/session';
import { SignInRequired } from './SignInRequired';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

function sourceWithStatus(status: 'signed-in' | 'signed-out'): SessionSource {
  return {
    restore: () => Promise.resolve(status),
    subscribe: () => () => undefined,
    signOut: () => Promise.resolve(),
  };
}

function renderGate(status: 'signed-in' | 'signed-out'): void {
  render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Theme name="light">
        <SessionProvider source={sourceWithStatus(status)}>
          <SignInRequired title="My Points" prompt="Sign in to see your points." returnTo="/rewards">
            <Text>points balance</Text>
          </SignInRequired>
        </SessionProvider>
      </Theme>
    </TamaguiProvider>
  );
}

describe('SignInRequired', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows a sign-in prompt instead of children to a guest', async () => {
    renderGate('signed-out');

    await waitFor(() => expect(screen.getByText('Sign in to see your points.')).toBeTruthy());
    expect(screen.queryByText('points balance')).toBeNull();
  });

  it('opens login with the tab to return to', async () => {
    renderGate('signed-out');

    await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy());
    fireEvent.press(screen.getByText('Sign in'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/login', params: { returnTo: '/rewards' } });
  });

  it('renders children for a signed-in customer', async () => {
    renderGate('signed-in');

    await waitFor(() => expect(screen.getByText('points balance')).toBeTruthy());
    expect(screen.queryByText('Sign in to see your points.')).toBeNull();
  });
});
