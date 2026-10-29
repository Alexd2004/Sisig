import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '@sisig/ui';

export default function CodeScreen(): JSX.Element {
  const [showCode, setShowCode] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Counter Code</Text>
        <Text style={styles.description}>
          Show this code at the counter for rewards and order tracking
        </Text>
      </View>

      {showCode ? (
        <View style={styles.codeCard}>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrText}>📱 QR CODE</Text>
            <Text style={styles.qrSubtext}>Your unique customer code</Text>
          </View>
          <Text style={styles.codeText}>SISIG-2024-ABC123</Text>
        </View>
      ) : (
        <View style={styles.lockedCard}>
          <Text style={styles.lockedText}>🔒 Sign in to view your code</Text>
          <Button title="Sign In" onPress={() => {}} style={styles.signInButton} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Your Code</Text>
        <Text style={styles.description}>
          Your unique code identifies you as a customer in our system. Use it to:
        </Text>

        <View style={styles.featureList}>
          <Text style={styles.feature}>✓ Track your orders in real-time</Text>
          <Text style={styles.feature}>✓ Earn loyalty points automatically</Text>
          <Text style={styles.feature}>✓ Redeem rewards at the counter</Text>
          <Text style={styles.feature}>✓ Receive special offers</Text>
        </View>
      </View>

      <Button
        title={showCode ? 'Hide Code' : 'Show Code'}
        onPress={() => setShowCode(!showCode)}
        style={styles.toggleButton}
      />
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  codeCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrText: {
    fontSize: 32,
    marginBottom: 8,
  },
  qrSubtext: {
    fontSize: 12,
    color: '#666',
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 2,
  },
  lockedCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lockedText: {
    fontSize: 16,
    marginBottom: 16,
  },
  signInButton: {
    width: '80%',
  },
  featureList: {
    marginTop: 12,
  },
  feature: {
    fontSize: 14,
    color: '#333',
    marginVertical: 6,
  },
  toggleButton: {
    marginHorizontal: 16,
    marginVertical: 24,
  },
});
