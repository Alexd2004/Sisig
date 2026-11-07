import { StyleSheet, View } from 'react-native';
import { Text, useThemedStyles, type AppColors } from '@sisig/ui';

interface OrderingPausedCardProps {
  message: string;
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: c.foregroundMuted,
    },
  });

/** Shown instead of the ordering UI while the ordering kill switch is off (PLAT-06). */
export function OrderingPausedCard({ message }: OrderingPausedCardProps): JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ordering is paused</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
