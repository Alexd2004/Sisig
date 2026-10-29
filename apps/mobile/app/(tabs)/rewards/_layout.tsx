import { Stack } from 'expo-router';
import { SignInRequired } from '../../../src/components/SignInRequired';

export default function RewardsLayout(): JSX.Element {
  return (
    <SignInRequired
      title="My Points"
      prompt="Sign in to see your points and redeem rewards."
      returnTo="/rewards"
    >
      <Stack>
        <Stack.Screen name="index" options={{ title: 'My Points' }} />
      </Stack>
    </SignInRequired>
  );
}
