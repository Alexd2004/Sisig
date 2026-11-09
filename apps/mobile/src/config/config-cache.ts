import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Where the last good remote config is kept on disk, so an offline cold start can use it.
 * It is separate from the TanStack persisted cache, which is dropped after 24 hours and on
 * logout. The config is not personal data, so it survives logout. Raw rows are stored, and
 * the app version that reads them validates them again.
 */
export interface ConfigCache {
  load(): Promise<unknown>;
  save(rows: unknown): Promise<void>;
}

export const CONFIG_CACHE_KEY = 'sisig.app-config';

/** The AsyncStorage-backed cache. A missing or unreadable entry loads as null. */
export const asyncStorageConfigCache: ConfigCache = {
  async load() {
    const raw = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  },
  async save(rows) {
    await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(rows));
  },
};
