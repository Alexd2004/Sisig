import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useThemedStyles, type AppColors } from '@sisig/ui';
import { apiUrl } from '@sisig/api';

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 18,
      color: c.foregroundMuted,
      marginBottom: 24,
    },
    apiText: {
      fontSize: 14,
      color: c.placeholder,
      marginBottom: 20,
    },
    countText: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 24,
    },
    button: {
      paddingHorizontal: 32,
    },
  });

export default function HomeScreen(): JSX.Element {
  const [count, setCount] = useState<number>(0);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Sisig</Text>
      <Text style={styles.subtitle}>Mobile App</Text>
      <Text style={styles.apiText}>API URL: {apiUrl()}</Text>
      <Text style={styles.countText}>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount((c) => c + 1)} style={styles.button} />
    </View>
  );
}
