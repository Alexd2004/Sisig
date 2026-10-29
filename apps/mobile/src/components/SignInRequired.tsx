import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@sisig/ui';
import { useSession } from '../session/session';

interface SignInRequiredProps {
  title: string;
  prompt: string;
  /** Tab path to return to once the customer has signed in. */
  returnTo: string;
  children: ReactNode;
}

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
  prompt: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 32,
  },
});
