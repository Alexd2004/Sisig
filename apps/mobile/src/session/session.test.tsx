import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { SessionProvider, useSession, type SessionSource } from './session';

function StatusProbe(): JSX.Element {
  const { status, signOut } = useSession();
  return (
    <>
      <Text>{status}</Text>
      <Pressable onPress={() => void signOut()}>
        <Text>sign out</Text>
      </Pressable>
    </>
  );
}

function sourceWithRestore(restore: SessionSource['restore']): SessionSource {
  return { restore, signOut: jest.fn(() => Promise.resolve()) };
}

describe('SessionProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports the restored session once the source resolves', async () => {
    render(
      <SessionProvider source={sourceWithRestore(() => Promise.resolve('signed-in'))}>
        <StatusProbe />
      </SessionProvider>
    );

    expect(screen.getByText('loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
  });

  it('treats a failed restore as signed out', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <SessionProvider
        source={sourceWithRestore(() => Promise.reject(new Error('restore failed')))}
      >
        <StatusProbe />
      </SessionProvider>
    );

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
  });

  it('signs out through the source and reports signed-out', async () => {
    const source = sourceWithRestore(() => Promise.resolve('signed-in'));

    render(
      <SessionProvider source={source}>
        <StatusProbe />
      </SessionProvider>
    );
    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());

    fireEvent.press(screen.getByText('sign out'));

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    expect(source.signOut).toHaveBeenCalledTimes(1);
  });

  it('throws when useSession is used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<StatusProbe />)).toThrow('useSession must be used inside SessionProvider');
  });
});
