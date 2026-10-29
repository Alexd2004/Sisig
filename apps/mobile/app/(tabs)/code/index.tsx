import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Button, Text, useThemedStyles, type AppColors } from '@sisig/ui';

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
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      color: c.foregroundMuted,
    },
    codeCard: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginVertical: 12,
      padding: 24,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: c.primary,
    },
    qrPlaceholder: {
      width: 200,
      height: 200,
      backgroundColor: c.background,
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
      color: c.foregroundMuted,
    },
    codeText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: c.primary,
      letterSpacing: 2,
    },
    lockedCard: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginVertical: 12,
      padding: 24,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
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
      marginVertical: 6,
    },
    toggleButton: {
      marginHorizontal: 16,
      marginVertical: 24,
    },
  });

export default function CodeScreen(): JSX.Element {
  const [showCode, setShowCode] = useState(false);
  const styles = useThemedStyles(createStyles);

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
