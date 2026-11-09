import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_APP_CONFIG,
  appConfigQueryOptions,
  parseAppConfig,
  type AppConfig,
  type ConfigReporter,
  type Database,
} from '@sisig/api';
import type { AppStateSource } from '../lib/session-lifecycle';
import { asyncStorageConfigCache, type ConfigCache } from './config-cache';
import { getInstalledVersion } from './installed-version';
import { reportConfigIssue } from './reporter';
import { evaluateUpdateGate, type ConfigSource, type UpdateGate } from './update-gate';

export interface RemoteConfigState {
  /** Validated config: every value is usable, malformed ones replaced by defaults. */
  config: AppConfig;
  source: ConfigSource;
  /** False until the disk cache has been read (or a fetch has finished), so the gate is known. */
  isReady: boolean;
  updateGate: UpdateGate;
}

/** Without a provider (for example in screen tests), screens see the bundled defaults. */
const RemoteConfigContext = createContext<RemoteConfigState>({
  config: DEFAULT_APP_CONFIG,
  source: 'defaults',
  isReady: true,
  updateGate: { status: 'none' },
});

/**
 * If AsyncStorage does not answer in time, start without the cache rather than hang on
 * splash. A cache that answers later still applies, unless a fetch has finished by then.
 */
const CACHE_LOAD_TIMEOUT_MS = 2000;

interface RemoteConfigProviderProps {
  client: SupabaseClient<Database>;
  children: ReactNode;
  /** Injectable for tests. Defaults to the AsyncStorage cache. */
  cache?: ConfigCache;
  /** Injectable for tests. Defaults to the reporter seam in ./reporter. */
  report?: ConfigReporter;
  appState?: AppStateSource;
  installedVersion?: string | null;
  platform?: string;
  cacheTimeoutMs?: number;
}

/**
 * Loads the remote config (PLAT-06) and shares it with the app.
 *
 * Order of preference: this session's fetch, then the last good config on disk, then the
 * bundled defaults. The config is fetched on mount, refetched every 5 minutes and on every
 * return to the foreground, and saved to disk after each successful fetch. A failed fetch
 * keeps whatever the app already had. Must be inside the QueryClientProvider.
 */
export function RemoteConfigProvider({
  client,
  children,
  cache = asyncStorageConfigCache,
  report = reportConfigIssue,
  appState = AppState,
  installedVersion = getInstalledVersion(),
  platform = Platform.OS,
  cacheTimeoutMs = CACHE_LOAD_TIMEOUT_MS,
}: RemoteConfigProviderProps): JSX.Element {
  const [cachedRows, setCachedRows] = useState<unknown>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // Each distinct problem is reported once per app session, not once per parse: an online
  // cold start parses the cached rows and then the fetched ones, and every unknown key would
  // otherwise be reported on every refetch that changes the payload.
  const reported = useRef(new Set<string>());
  const reportOnce = useCallback<ConfigReporter>(
    (issue) => {
      const signature = `${issue.kind}|${issue.key ?? ''}|${issue.detail}`;
      if (!reported.current.has(signature)) {
        reported.current.add(signature);
        report(issue);
      }
    },
    [report]
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        setCacheLoaded(true);
      }
    }, cacheTimeoutMs);
    cache
      .load()
      .catch(() => null)
      .then((rows) => {
        clearTimeout(timer);
        if (active) {
          // A fetch that finished first already wins; keep it.
          setCachedRows((current: unknown) => current ?? rows);
          setCacheLoaded(true);
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cache, cacheTimeoutMs]);

  // useQuery from this app's own TanStack copy (see appConfigQueryOptions in @sisig/api).
  const query = useQuery(appConfigQueryOptions(client));
  const serverRows = query.data;
  const { refetch } = query;

  // Keep the last good fetch on disk for the next offline cold start, and in state, so the
  // config survives queryClient.clear() on logout.
  useEffect(() => {
    if (serverRows === undefined) {
      return;
    }
    setCachedRows(serverRows);
    cache.save(serverRows).catch(() => {
      // Not fatal: the next successful fetch saves again.
    });
  }, [cache, serverRows]);

  // Refetch whenever the app returns to the foreground, whether or not the data is stale.
  useEffect(() => {
    const subscription = appState.addEventListener('change', (status) => {
      if (status === 'active') {
        void refetch();
      }
    });
    return () => subscription.remove();
  }, [appState, refetch]);

  const rows = serverRows ?? cachedRows;
  const source: ConfigSource =
    serverRows !== undefined
      ? 'server'
      : cachedRows !== null && cachedRows !== undefined
        ? 'cache'
        : 'defaults';

  // Parsed once per payload: TanStack keeps the same reference for equal data.
  const config = useMemo(
    () =>
      rows === null || rows === undefined ? DEFAULT_APP_CONFIG : parseAppConfig(rows, reportOnce),
    [rows, reportOnce]
  );

  const updateGate = useMemo(
    () => evaluateUpdateGate({ installedVersion, platform, config, source }, reportOnce),
    [installedVersion, platform, config, source, reportOnce]
  );

  const isReady = cacheLoaded || serverRows !== undefined;

  const value = useMemo(
    () => ({ config, source, isReady, updateGate }),
    [config, source, isReady, updateGate]
  );

  return <RemoteConfigContext.Provider value={value}>{children}</RemoteConfigContext.Provider>;
}

/** The current remote config, its source and the update gate. */
export function useRemoteConfig(): RemoteConfigState {
  return useContext(RemoteConfigContext);
}
