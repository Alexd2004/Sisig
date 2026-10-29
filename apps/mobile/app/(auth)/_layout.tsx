import { Stack } from 'expo-router';

export default function AuthLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ title: 'Welcome' }} />
      <Stack.Screen name="login" options={{ title: 'Log in' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Sign up' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verify email' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Reset password' }} />
    </Stack>
  );
}
