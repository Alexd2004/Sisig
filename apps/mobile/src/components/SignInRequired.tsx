import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text, useThemedStyles, type AppColors } from '@sisig/ui';
import { useSession } from '../session/session';

interface SignInRequiredProps {
  title: string;
  prompt: string;
  /** Tab path to return to once the customer has signed in. */
  returnTo: string;
  children: ReactNode;
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
    prompt: {
      fontSize: 15,
      color: c.foregroundMuted,
      textAlign: 'center',
      marginBottom: 24,
    },
    button: {
      paddingHorizontal: 32,
    },
  });

/**
 * Renders children for signed-in customers. Guests see a sign-in prompt
 * instead, and the sign-in screen sends them back to `returnTo` afterwards.
 */
export function SignInRequired({
  title,
  prompt,
  returnTo,
  children,
}: SignInRequiredProps): JSX.Element {
  const { status } = useSession();
  const styles = useThemedStyles(createStyles);

  if (status === 'signed-in') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.prompt}>{prompt}</Text>
      <Button
        title="Sign in"
        onPress={() => router.push({ pathname: '/login', params: { returnTo } })}
        style={styles.button}
      />
    </View>
  );
}
