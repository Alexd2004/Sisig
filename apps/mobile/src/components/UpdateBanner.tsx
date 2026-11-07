import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useThemedStyles, type AppColors } from '@sisig/ui';
import {
  asyncStorageBannerStore,
  localDate,
  shouldShowUpdateBanner,
  type UpdateBannerStore,
} from '../config/banner-throttle';
import { useRemoteConfig } from '../config/remote-config';
import { openStoreUrl } from '../config/store-link';

interface UpdateBannerProps {
  /** Injectable for tests. */
  store?: UpdateBannerStore;
  now?: () => Date;
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    banner: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.primary,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    body: {
      fontSize: 14,
      color: c.foregroundMuted,
      marginBottom: 12,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
  });

const currentTime = (): Date => new Date();

/**
 * Soft update banner (PLAT-06). Shown when the installed version is below
 * recommended_version but still supported, at most once per local calendar day. The day is
 * recorded when the banner appears, so it does not come back that day even if not dismissed.
 */
export function UpdateBanner({
  store = asyncStorageBannerStore,
  now = currentTime,
}: UpdateBannerProps): JSX.Element | null {
  const { updateGate } = useRemoteConfig();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  const isSoft = updateGate.status === 'soft';

  useEffect(() => {
    if (!isSoft) {
      setVisible(false);
      return;
    }
    let active = true;
    const today = localDate(now());
    store
      .readLastShown()
      .then((lastShown) => {
        if (active && shouldShowUpdateBanner(lastShown, today)) {
          setVisible(true);
          return store.recordShown(today);
        }
        return undefined;
      })
      .catch(() => {
        // Storage failed: stay hidden rather than risk showing it more than once a day.
      });
    return () => {
      active = false;
    };
  }, [isSoft, store, now]);

  if (!visible || updateGate.status !== 'soft') {
    return null;
  }
  const { storeUrl } = updateGate;

  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={styles.title}>A new version is available</Text>
      <Text style={styles.body}>Update for the latest features and fixes.</Text>
      <View style={styles.actions}>
        {storeUrl !== null ? (
          <Button
            title="Update"
            accessibilityHint="Opens the app store"
            onPress={() => openStoreUrl(storeUrl)}
          />
        ) : null}
        <Button
          title="Not now"
          accessibilityLabel="Dismiss update banner"
          onPress={() => setVisible(false)}
        />
      </View>
    </View>
  );
}
