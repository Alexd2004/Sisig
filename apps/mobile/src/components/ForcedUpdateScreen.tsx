import { StyleSheet, View } from 'react-native';
import { Button, Text, useThemedStyles, type AppColors } from '@sisig/ui';
import { openStoreUrl } from '../config/store-link';

interface ForcedUpdateScreenProps {
  storeUrl: string;
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 12,
      textAlign: 'center',
    },
    body: {
      fontSize: 15,
      color: c.foregroundMuted,
      textAlign: 'center',
      marginBottom: 24,
    },
    button: {
      paddingHorizontal: 32,
    },
  });

/**
 * Blocking update screen (PLAT-06). The root layout renders it instead of the navigator when
 * the installed version is below the minimum, so there is nothing to dismiss or go back to.
 */
export function ForcedUpdateScreen({ storeUrl }: ForcedUpdateScreenProps): JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Update required
      </Text>
      <Text style={styles.body}>
        This version of the app is no longer supported. Please update to keep ordering and earning
        rewards.
      </Text>
      <Button
        title="Update now"
        accessibilityHint="Opens the app store"
        onPress={() => openStoreUrl(storeUrl)}
        style={styles.button}
      />
    </View>
  );
}
