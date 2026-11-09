import { Linking } from 'react-native';

/**
 * Open an app store link from the remote config. The link was validated by parseAppConfig
 * (https on apps.apple.com or play.google.com). A failure is logged; the user can tap again.
 */
export function openStoreUrl(url: string): void {
  Linking.openURL(url).catch((error: unknown) => {
    console.warn('Could not open the store link:', error);
  });
}
