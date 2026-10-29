import { Stack } from 'expo-router';
import { SignInRequired } from '../../../src/components/SignInRequired';

export default function CodeLayout(): JSX.Element {
  return (
    <SignInRequired title="My Code" prompt="Sign in to show your counter code." returnTo="/code">
      <Stack>
        <Stack.Screen name="index" options={{ title: 'My Code' }} />
      </Stack>
    </SignInRequired>
  );
}
