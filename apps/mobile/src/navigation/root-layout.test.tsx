import { act, render, screen, waitFor } from '@testing-library/react-native';
import type { RemoteConfigState } from '../config/remote-config';
import RootLayout from '../../app/_layout';

// The root layout's PLAT-06 wiring: the forced-update screen replaces the navigator, the
// navigation effects stay off while blocked, and nothing renders until the config is ready.

const mockReplace = jest.fn();
const mockDismissAll = jest.fn();
let mockSegments: string[] = [];
let mockConfigState: RemoteConfigState;

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  function Stack(): JSX.Element {
    return <Text>navigator</Text>;
  }
  Stack.Screen = function StackScreen(): null {
    return null;
  };
  return {
    Stack,
    router: {
      replace: (...args: unknown[]) => mockReplace(...args),
      dismissAll: () => mockDismissAll(),
    },
    useSegments: () => mockSegments,
    useGlobalSearchParams: () => ({}),
  };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));

jest.mock('@expo-google-fonts/inter', () => ({ Inter_400Regular: 1, Inter_600SemiBold: 2 }));

jest.mock('../lib/supabase', () => {
  const { QueryClient } =
    jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { supabase: {}, queryClient: new QueryClient() };
});

jest.mock('../lib/query-persistence', () => ({
  persistOptions: {
    persister: {
      persistClient: () => Promise.resolve(),
      restoreClient: () => Promise.resolve(undefined),
      removeClient: () => Promise.resolve(),
    },
  },
}));

jest.mock('../session/supabase-source', () => ({
  createSupabaseSessionSource: () => ({
    restore: () => Promise.resolve('signed-in'),
    subscribe: () => () => undefined,
    signOut: () => Promise.resolve(),
  }),
}));

jest.mock('../config/remote-config', () => ({
  RemoteConfigProvider: ({ children }: { children: unknown }) => children,
  useRemoteConfig: () => mockConfigState,
}));

function configState(overrides: Partial<RemoteConfigState>): RemoteConfigState {
  const { DEFAULT_APP_CONFIG } = jest.requireActual('@sisig/api');
  return {
    config: DEFAULT_APP_CONFIG,
    source: 'server',
    isReady: true,
    updateGate: { status: 'none' },
    ...overrides,
  };
}

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.sisig.mobile';

describe('RootLayout update gate', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockDismissAll.mockClear();
    // A signed-in user on the auth stack, so the layout would redirect to /home.
    mockSegments = ['(auth)', 'login'];
  });

  it('renders the navigator and redirects when nothing blocks', async () => {
    mockConfigState = configState({});
    render(<RootLayout />);

    await waitFor(() => expect(screen.getByText('navigator')).toBeTruthy());
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  it('renders the forced-update screen instead of the navigator, with no navigation', async () => {
    mockConfigState = configState({ updateGate: { status: 'blocked', storeUrl: STORE_URL } });
    render(<RootLayout />);

    await waitFor(() => expect(screen.getByText('Update required')).toBeTruthy());
    expect(screen.queryByText('navigator')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockDismissAll).not.toHaveBeenCalled();
  });

  it('renders nothing (splash stays) until the remote config is ready', async () => {
    mockConfigState = configState({ isReady: false });
    const { rerender } = render(<RootLayout />);

    // Let the session restore; a ready layout would now redirect to /home.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText('navigator')).toBeNull();
    expect(screen.queryByText('Update required')).toBeNull();

    // The same tree mounts the navigator and redirects as soon as the config is ready.
    mockConfigState = configState({});
    rerender(<RootLayout />);
    await waitFor(() => expect(screen.getByText('navigator')).toBeTruthy());
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });
});
