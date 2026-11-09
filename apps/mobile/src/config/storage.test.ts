import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  asyncStorageBannerStore,
  localDate,
  shouldShowUpdateBanner,
  UPDATE_BANNER_KEY,
} from './banner-throttle';
import { asyncStorageConfigCache, CONFIG_CACHE_KEY } from './config-cache';
import { getInstalledVersion } from './installed-version';
import { reportConfigIssue, setConfigReporter } from './reporter';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('config cache', () => {
  it('round-trips the raw rows', async () => {
    const rows = [{ key: 'ordering_enabled', value: false }];
    await asyncStorageConfigCache.save(rows);

    expect(await AsyncStorage.getItem(CONFIG_CACHE_KEY)).toBe(JSON.stringify(rows));
    expect(await asyncStorageConfigCache.load()).toEqual(rows);
  });

  it('loads null when nothing is cached', async () => {
    expect(await asyncStorageConfigCache.load()).toBeNull();
  });

  it('loads null when the entry is not JSON', async () => {
    await AsyncStorage.setItem(CONFIG_CACHE_KEY, '{not json');
    expect(await asyncStorageConfigCache.load()).toBeNull();
  });
});

describe('update banner throttle', () => {
  it('formats the local calendar date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('shows once per local day', () => {
    expect(shouldShowUpdateBanner(null, '2026-11-06')).toBe(true);
    expect(shouldShowUpdateBanner('2026-11-06', '2026-11-06')).toBe(false);
    expect(shouldShowUpdateBanner('2026-11-05', '2026-11-06')).toBe(true);
  });

  it('stores the last shown date under its own key', async () => {
    await asyncStorageBannerStore.recordShown('2026-11-06');

    expect(await AsyncStorage.getItem(UPDATE_BANNER_KEY)).toBe('2026-11-06');
    expect(await asyncStorageBannerStore.readLastShown()).toBe('2026-11-06');
  });
});

describe('getInstalledVersion', () => {
  const mutableConstants = Constants as unknown as {
    expoConfig: { version?: unknown } | null;
  };

  afterEach(() => {
    mutableConstants.expoConfig = { version: '1.0.0' };
  });

  it('reads the version from the embedded app config', () => {
    expect(getInstalledVersion()).toBe('1.0.0');
  });

  it('returns null when the version is unknown', () => {
    mutableConstants.expoConfig = null;
    expect(getInstalledVersion()).toBeNull();
    mutableConstants.expoConfig = { version: '' };
    expect(getInstalledVersion()).toBeNull();
  });
});

describe('config reporter seam', () => {
  afterEach(() => setConfigReporter(null));

  it('sends issues to the reporter that was set', () => {
    const reporter = jest.fn();
    setConfigReporter(reporter);
    const issue = {
      kind: 'unknown_key' as const,
      key: 'x',
      detail: 'not used',
    };

    reportConfigIssue(issue);

    expect(reporter).toHaveBeenCalledWith(issue);
  });

  it('warns in development by default', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    reportConfigIssue({
      kind: 'invalid_value',
      key: 'ordering_enabled',
      detail: 'bad',
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ordering_enabled'));
    warn.mockRestore();
  });

  it('ignores a reporter that throws', () => {
    setConfigReporter(() => {
      throw new Error('sentry down');
    });

    expect(() => reportConfigIssue({ kind: 'invalid_payload', detail: 'bad' })).not.toThrow();
  });
});
