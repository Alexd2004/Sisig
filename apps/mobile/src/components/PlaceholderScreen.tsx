import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useThemedStyles, type AppColors } from '@sisig/ui';

interface PlaceholderScreenProps {
  title: string;
  note: string;
  children?: ReactNode;
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    note: {
      fontSize: 14,
      color: c.foregroundMuted,
      textAlign: 'center',
      marginBottom: 24,
    },
  });

/** Stand-in body for a route whose real screen is built in a later ticket. */
export function PlaceholderScreen({ title, note, children }: PlaceholderScreenProps): JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
      {children}
    </View>
  );
}
