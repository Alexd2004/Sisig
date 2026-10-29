import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function HomeScreen(): JSX.Element {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Welcome to Sisig Eh!</Text>
        <Text style={styles.description}>
          Browse our menu, order food, and earn loyalty points
        </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#666',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});
