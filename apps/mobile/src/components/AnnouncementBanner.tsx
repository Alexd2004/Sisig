import { StyleSheet, View } from 'react-native';
import { Text, useThemedStyles, type AppColors } from '@sisig/ui';
import { useRemoteConfig } from '../config/remote-config';

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    banner: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.accent,
    },
    text: {
      fontSize: 14,
    },
  });

/** Remote announcement (app_config.announcement_message). Renders nothing when there is none. */
export function AnnouncementBanner(): JSX.Element | null {
  const { config } = useRemoteConfig();
  const styles = useThemedStyles(createStyles);

  if (config.announcement_message === null) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{config.announcement_message}</Text>
    </View>
  );
}
