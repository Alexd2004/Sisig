import type { ReactNode } from 'react';
import { Linking, Text, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConfigIssue, Database } from '@sisig/api';
import { TamaguiProvider, Theme, tamaguiConfig } from '@sisig/ui';
import OrderScreen from '../../app/(tabs)/order/index';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { ForcedUpdateScreen } from '../components/ForcedUpdateScreen';
import { UpdateBanner } from '../components/UpdateBanner';
import type { AppStateSource } from '../lib/session-lifecycle';
import type { UpdateBannerStore } from './banner-throttle';
import type { ConfigCache } from './config-cache';
import { RemoteConfigProvider, useRemoteConfig } from './remote-config';
import { DEFAULT_ORDERING_PAUSED_MESSAGE, useFeature } from './useFeature';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

type Rows = { key: string; value: unknown }[];
type FetchResult = { data: Rows | null; error: unknown };

const OFFLINE: FetchResult = {
  data: null,
  error: {
    message: 'TypeError: Network request failed',
    details: '',
    hint: '',
    code: '',
  },
};

function fakeClient(results: FetchResult[]) {
  const select = jest.fn(() => Promise.resolve(results.length > 1 ? results.shift()! : results[0]));
  const client = {
    from: jest.fn(() => ({ select })),
  } as unknown as SupabaseClient<Database>;
  return { client, select };
}

function memoryCache(initial: unknown = null): ConfigCache & { saved: unknown[] } {
  let stored = initial;
  const saved: unknown[] = [];
  return {
    saved,
    load: () => Promise.resolve(stored),
    save: (rows) => {
      stored = rows;
      saved.push(rows);
      return Promise.resolve();
    },
  };
}

function fakeAppState() {
  let listener: ((status: AppStateStatus) => void) | undefined;
  const source: AppStateSource = {
    currentState: 'active',
    addEventListener: (_type, next) => {
      listener = next;
      return { remove: () => (listener = undefined) };
    },
  };
  return { source, emit: (status: AppStateStatus) => listener?.(status) };
}

function Probe(): JSX.Element {
  const { source, isReady, updateGate } = useRemoteConfig();
  const ordering = useFeature('ordering');
  return (
    <Text testID="probe">
      {JSON.stringify({
        source,
        isReady,
        gate: updateGate.status,
        ordering: ordering.enabled,
      })}
    </Text>
  );
}

function probe(): {
  source: string;
  isReady: boolean;
  gate: string;
  ordering: boolean;
} {
  return JSON.parse(String(screen.getByTestId('probe').props.children));
}

interface Setup {
  results?: FetchResult[];
  cache?: ConfigCache;
  installedVersion?: string | null;
  cacheTimeoutMs?: number;
  children?: ReactNode;
}

function setup({
  results = [{ data: [], error: null }],
  cache = memoryCache(),
  installedVersion = '1.0.0',
  cacheTimeoutMs,
  children,
}: Setup) {
  const issues: ConfigIssue[] = [];
  const { client, select } = fakeClient([...results]);
  const appState = fakeAppState();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <Theme name="light">
          <RemoteConfigProvider
            client={client}
            cache={cache}
            report={(issue) => issues.push(issue)}
            appState={appState.source}
            installedVersion={installedVersion}
            platform="android"
            cacheTimeoutMs={cacheTimeoutMs}
          >
            {children ?? <Probe />}
          </RemoteConfigProvider>
        </Theme>
      </TamaguiProvider>
    </QueryClientProvider>
  );
  return { issues, select, appState, queryClient };
}

/** Let the cache read, the fetch and the effects that follow finish. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const BLOCK_ROWS: Rows = [{ key: 'min_supported_version_android', value: '2.0.0' }];

describe('RemoteConfigProvider', () => {
  it('first launch offline: bundled defaults, ordering on, never blocked', async () => {
    setup({ results: [OFFLINE], installedVersion: '0.0.1' });

    await waitFor(() => expect(probe().isReady).toBe(true));
    expect(probe()).toEqual({
      source: 'defaults',
      isReady: true,
      gate: 'none',
      ordering: true,
    });
  });

  it('offline with a cache: uses the last good config, which may block', async () => {
    setup({ results: [OFFLINE], cache: memoryCache(BLOCK_ROWS) });

    await waitFor(() => expect(probe().source).toBe('cache'));
    expect(probe().gate).toBe('blocked');
  });

  it('uses and caches the fetched config', async () => {
    const cache = memoryCache();
    setup({
      results: [{ data: [{ key: 'ordering_enabled', value: false }], error: null }],
      cache,
    });

    await waitFor(() => expect(probe().source).toBe('server'));
    expect(probe().ordering).toBe(false);
    expect(cache.saved).toEqual([[{ key: 'ordering_enabled', value: false }]]);
  });

  it('reports a malformed value once and keeps its default', async () => {
    const { issues } = setup({
      results: [{ data: [{ key: 'ordering_enabled', value: 'off' }], error: null }],
    });

    await waitFor(() => expect(probe().source).toBe('server'));
    expect(probe().ordering).toBe(true);
    expect(issues).toEqual([
      expect.objectContaining({
        kind: 'invalid_value',
        key: 'ordering_enabled',
      }),
    ]);
  });

  it('refetches on every return to the foreground and applies the change', async () => {
    const { select, appState } = setup({
      results: [
        { data: [], error: null },
        { data: [{ key: 'ordering_enabled', value: false }], error: null },
      ],
    });
    await waitFor(() => expect(probe().source).toBe('server'));
    expect(probe().ordering).toBe(true);

    act(() => appState.emit('background'));
    expect(select).toHaveBeenCalledTimes(1);

    act(() => appState.emit('active'));
    await waitFor(() => expect(probe().ordering).toBe(false));
    expect(select).toHaveBeenCalledTimes(2);
  });

  it('keeps the fetched config when a later foreground refetch fails', async () => {
    const { appState, select } = setup({
      results: [{ data: BLOCK_ROWS, error: null }, OFFLINE],
    });
    await waitFor(() => expect(probe().gate).toBe('blocked'));

    act(() => appState.emit('active'));
    await waitFor(() => expect(select).toHaveBeenCalledTimes(2));
    expect(probe()).toEqual(expect.objectContaining({ source: 'server', gate: 'blocked' }));
  });
});

describe('RemoteConfigProvider edge cases', () => {
  it('keeps the config after logout clears the query cache and a refetch fails', async () => {
    const { appState, queryClient } = setup({
      results: [{ data: BLOCK_ROWS, error: null }, OFFLINE],
    });
    await waitFor(() => expect(probe().source).toBe('server'));

    act(() => queryClient.clear());
    act(() => appState.emit('active'));
    await settle();

    expect(probe()).toEqual(expect.objectContaining({ source: 'cache', gate: 'blocked' }));
  });

  it('starts on defaults when the disk cache is slow, then applies it when it answers', async () => {
    let answer: (rows: unknown) => void = () => undefined;
    const slowCache: ConfigCache = {
      load: () => new Promise((resolve) => (answer = resolve)),
      save: () => Promise.resolve(),
    };
    setup({ results: [OFFLINE], cache: slowCache, cacheTimeoutMs: 10 });

    await waitFor(() => expect(probe().isReady).toBe(true));
    expect(probe()).toEqual(expect.objectContaining({ source: 'defaults', gate: 'none' }));

    await act(async () => answer(BLOCK_ROWS));
    expect(probe()).toEqual(expect.objectContaining({ source: 'cache', gate: 'blocked' }));
  });

  it('reports the same problem once, even when the cache and the fetch both contain it', async () => {
    const bad: Rows = [{ key: 'ordering_enabled', value: 'off' }];
    const { issues } = setup({ results: [{ data: bad, error: null }], cache: memoryCache(bad) });

    await waitFor(() => expect(probe().source).toBe('server'));
    expect(issues).toHaveLength(1);
  });
});

describe('Order tab kill switch', () => {
  it('hides checkout and shows the configured message while ordering is off', async () => {
    setup({
      results: [
        {
          data: [
            { key: 'ordering_enabled', value: false },
            { key: 'ordering_paused_message', value: 'POS is down, back soon' },
          ],
          error: null,
        },
      ],
      children: <OrderScreen />,
    });

    await waitFor(() => expect(screen.getByText('POS is down, back soon')).toBeTruthy());
    expect(screen.queryByText('Checkout')).toBeNull();
    expect(screen.queryByText('Add')).toBeNull();
  });

  it('falls back to the default message when none is configured', async () => {
    setup({
      results: [{ data: [{ key: 'ordering_enabled', value: false }], error: null }],
      children: <OrderScreen />,
    });

    await waitFor(() => expect(screen.getByText(DEFAULT_ORDERING_PAUSED_MESSAGE)).toBeTruthy());
  });

  it('shows ordering when it is on', async () => {
    const { select } = setup({ children: <OrderScreen /> });

    await waitFor(() => expect(select).toHaveBeenCalled());
    await settle();
    expect(screen.getByText('Checkout')).toBeTruthy();
  });
});

describe('ForcedUpdateScreen', () => {
  it('has no dismiss action and opens the store link', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <Theme name="light">
          <ForcedUpdateScreen storeUrl="https://play.google.com/store/apps/details?id=com.sisig.mobile" />
        </Theme>
      </TamaguiProvider>
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.press(screen.getByText('Update now'));

    expect(openURL).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=com.sisig.mobile'
    );
    openURL.mockRestore();
  });
});

describe('UpdateBanner', () => {
  const SOFT_ROWS: Rows = [{ key: 'recommended_version', value: '1.5.0' }];
  const today = () => new Date(2026, 10, 6, 12);

  function bannerStore(lastShown: string | null): UpdateBannerStore & { recordShown: jest.Mock } {
    return {
      readLastShown: () => Promise.resolve(lastShown),
      recordShown: jest.fn(() => Promise.resolve()),
    };
  }

  it('shows below the recommended version, records the day, and can be dismissed', async () => {
    const store = bannerStore(null);
    setup({
      results: [{ data: SOFT_ROWS, error: null }],
      children: <UpdateBanner store={store} now={today} />,
    });

    await waitFor(() => expect(screen.getByText('A new version is available')).toBeTruthy());
    expect(store.recordShown).toHaveBeenCalledWith('2026-11-06');

    fireEvent.press(screen.getByLabelText('Dismiss update banner'));
    expect(screen.queryByText('A new version is available')).toBeNull();
  });

  it('does not show again on the same day', async () => {
    const store = bannerStore('2026-11-06');
    const readLastShown = jest.spyOn(store, 'readLastShown');
    setup({
      results: [{ data: SOFT_ROWS, error: null }],
      children: <UpdateBanner store={store} now={today} />,
    });

    await waitFor(() => expect(readLastShown).toHaveBeenCalled());
    await settle();
    expect(store.recordShown).not.toHaveBeenCalled();
    expect(screen.queryByText('A new version is available')).toBeNull();
  });

  it('does not show at or above the recommended version', async () => {
    const store = bannerStore(null);
    const { select } = setup({
      results: [{ data: SOFT_ROWS, error: null }],
      installedVersion: '1.5.0',
      children: <UpdateBanner store={store} now={today} />,
    });

    await waitFor(() => expect(select).toHaveBeenCalled());
    await settle();
    expect(store.recordShown).not.toHaveBeenCalled();
    expect(screen.queryByText('A new version is available')).toBeNull();
  });
});

describe('AnnouncementBanner', () => {
  it('shows the configured announcement', async () => {
    setup({
      results: [
        {
          data: [
            {
              key: 'announcement_message',
              value: 'Closed Monday for the holiday',
            },
          ],
          error: null,
        },
      ],
      children: <AnnouncementBanner />,
    });

    await waitFor(() => expect(screen.getByText('Closed Monday for the holiday')).toBeTruthy());
  });
});
