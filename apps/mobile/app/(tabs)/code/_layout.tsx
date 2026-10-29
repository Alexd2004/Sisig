import { Stack } from 'expo-router';
import { SignInRequired } from '../../../src/components/SignInRequired';
import { useStackScreenOptions } from '../../../src/navigation/stack-options';

export default function CodeLayout(): JSX.Element {
  const screenOptions = useStackScreenOptions();

  return (
    <SignInRequired title="My Code" prompt="Sign in to show your counter code." returnTo="/code">
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ title: 'My Code' }} />
      </Stack>
    </SignInRequired>
  );
}
