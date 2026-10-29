import { View, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button, Text, useThemedStyles, type AppColors } from '@sisig/ui';

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    pointsCard: {
      backgroundColor: c.primary,
      margin: 16,
      padding: 24,
      borderRadius: 12,
      alignItems: 'center',
    },
    pointsLabel: {
      color: c.primaryForeground,
      fontSize: 14,
      marginBottom: 8,
    },
    pointsAmount: {
      color: c.primaryForeground,
      fontSize: 48,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    pointsSubtext: {
      // No opacity: a faded foreground drops below WCAG AA on the primary fill.
      color: c.primaryForeground,
      fontSize: 12,
    },
    section: {
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    rewardCard: {
      backgroundColor: c.surface,
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    rewardInfo: {
      flex: 1,
    },
    rewardName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    rewardCost: {
      fontSize: 14,
      color: c.foregroundMuted,
    },
    infoCard: {
      backgroundColor: c.surface,
      margin: 16,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    infoText: {
      fontSize: 13,
      color: c.foregroundMuted,
      lineHeight: 20,
    },
  });

export default function RewardsScreen(): JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>Your Points</Text>
        <Text style={styles.pointsAmount}>0</Text>
        <Text style={styles.pointsSubtext}>Earn points on every order</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Rewards</Text>

        <View style={styles.rewardCard}>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardName}>Free Drink</Text>
            <Text style={styles.rewardCost}>500 points</Text>
          </View>
          <Button title="Redeem" onPress={() => router.push('/redeem-confirm')} />
        </View>

        <View style={styles.rewardCard}>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardName}>Burger Combo</Text>
            <Text style={styles.rewardCost}>750 points</Text>
          </View>
          <Button title="Redeem" onPress={() => router.push('/redeem-confirm')} />
        </View>

        <View style={styles.rewardCard}>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardName}>$10 Discount</Text>
            <Text style={styles.rewardCost}>1000 points</Text>
          </View>
          <Button title="Redeem" onPress={() => router.push('/redeem-confirm')} />
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          • Earn 1 point per $1 spent{'\n'}• Redeem for free items and discounts{'\n'}• Points never
          expire
        </Text>
      </View>
    </ScrollView>
  );
}
