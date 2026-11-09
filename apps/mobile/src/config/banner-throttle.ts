import AsyncStorage from '@react-native-async-storage/async-storage';

/** The local date (YYYY-MM-DD) the soft update banner was last shown. Device-wide, not per user. */
export const UPDATE_BANNER_KEY = 'sisig.update-banner.last-shown';

/** The device's local calendar date as YYYY-MM-DD. */
export function localDate(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The banner shows at most once per local calendar day. */
export function shouldShowUpdateBanner(lastShown: string | null, today: string): boolean {
  return lastShown !== today;
}

export interface UpdateBannerStore {
  readLastShown(): Promise<string | null>;
  recordShown(today: string): Promise<void>;
}

export const asyncStorageBannerStore: UpdateBannerStore = {
  readLastShown: () => AsyncStorage.getItem(UPDATE_BANNER_KEY),
  recordShown: (today) => AsyncStorage.setItem(UPDATE_BANNER_KEY, today),
};
