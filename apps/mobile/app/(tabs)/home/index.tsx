import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, useThemedStyles, type AppColors } from '@sisig/ui';

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      color: c.foregroundMuted,
    },
    card: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    cardText: {
      fontSize: 14,
      marginVertical: 4,
    },
    cardSubtext: {
      fontSize: 12,
      color: c.placeholder,
      marginTop: 8,
    },
  });

export default function HomeScreen(): JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Welcome to Sisig Eh!</Text>
        <Text style={styles.description}>Browse our menu, order food, and earn loyalty points</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Specials</Text>
        <Text style={styles.cardText}>Spicy Sisig Bowl - 20% off</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Points</Text>
        <Text style={styles.cardText}>You have 0 points</Text>
        <Text style={styles.cardSubtext}>Tap Rewards to see details</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Links</Text>
        <Text style={styles.cardText}>• Browse Menu</Text>
        <Text style={styles.cardText}>• Track Your Order</Text>
        <Text style={styles.cardText}>• Redeem Points</Text>
      </View>
    </ScrollView>
  );
}
