import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PlaceholderScreenProps {
  title: string;
  note: string;
  children?: ReactNode;
}

/** Stand-in body for a route whose real screen is built in a later ticket. */
export function PlaceholderScreen({ title, note, children }: PlaceholderScreenProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
});
