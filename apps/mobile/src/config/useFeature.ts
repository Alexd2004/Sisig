import { useRemoteConfig } from './remote-config';

/** Features that the restaurant can switch off remotely (public.app_config kill switches). */
export type Feature = 'ordering' | 'receiptScan';

/** While a feature is off, `message` is what to tell the customer. */
export type FeatureState = { enabled: true; message: null } | { enabled: false; message: string };

export const DEFAULT_ORDERING_PAUSED_MESSAGE =
  'Online ordering is paused right now. Please try again later or order at the counter.';
export const DEFAULT_RECEIPT_SCAN_PAUSED_MESSAGE =
  'Receipt scanning is paused right now. Please try again later.';

/**
 * Whether a feature is on. Feature screens use it to hide or disable their entry points.
 * Values come from the remote config, so they change within 5 minutes or on the next foreground.
 */
export function useFeature(feature: Feature): FeatureState {
  const { config } = useRemoteConfig();

  if (feature === 'ordering') {
    return config.ordering_enabled
      ? { enabled: true, message: null }
      : {
          enabled: false,
          message: config.ordering_paused_message ?? DEFAULT_ORDERING_PAUSED_MESSAGE,
        };
  }

  return config.receipt_scan_enabled
    ? { enabled: true, message: null }
    : { enabled: false, message: DEFAULT_RECEIPT_SCAN_PAUSED_MESSAGE };
}
