import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@sisig/ui';
import { apiUrl } from '@sisig/api';

export default function HomeScreen(): JSX.Element {
  const [count, setCount] = useState<number>(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Sisig</Text>
      <Text style={styles.subtitle}>Mobile App</Text>
      <Text style={styles.apiText}>API URL: {apiUrl()}</Text>
      <Text style={styles.countText}>Count: {count}</Text>
      <Button
        title="Increment"
        onPress={() => setCount((c) => c + 1)}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  apiText: {
    fontSize: 14,
    color: '#999',
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
