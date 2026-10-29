import { Stack } from 'expo-router';
import { SignInRequired } from '../../../src/components/SignInRequired';
import { useStackScreenOptions } from '../../../src/navigation/stack-options';

export default function RewardsLayout(): JSX.Element {
  const screenOptions = useStackScreenOptions();

  return (
    <SignInRequired
      title="My Points"
      prompt="Sign in to see your points and redeem rewards."
      returnTo="/rewards"
    >
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ title: 'My Points' }} />
      </Stack>
    </SignInRequired>
  );
}
