import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '@sisig/ui';

export default function RewardsScreen(): JSX.Element {
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
          <Button title="Redeem" onPress={() => {}} />
        </View>

        <View style={styles.rewardCard}>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardName}>Burger Combo</Text>
            <Text style={styles.rewardCost}>750 points</Text>
          </View>
          <Button title="Redeem" onPress={() => {}} />
        </View>

        <View style={styles.rewardCard}>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardName}>$10 Discount</Text>
            <Text style={styles.rewardCost}>1000 points</Text>
          </View>
          <Button title="Redeem" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          • Earn 1 point per $1 spent{'\n'}
          • Redeem for free items and discounts{'\n'}
          • Points never expire
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  pointsCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  pointsLabel: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
  },
  pointsAmount: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pointsSubtext: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.8,
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
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
