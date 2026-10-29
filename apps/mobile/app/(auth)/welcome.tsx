import { router } from 'expo-router';
import { Button } from '@sisig/ui';
import { PlaceholderScreen } from '../../src/components/PlaceholderScreen';

export default function WelcomeScreen(): JSX.Element {
  return (
    <PlaceholderScreen
      title="Welcome to Sisig Eh!"
      note="Placeholder. The real welcome screen is built in AUTH-01 to AUTH-03."
    >
      <Button title="Log in" onPress={() => router.push('/login')} />
      <Button title="Sign up" onPress={() => router.push('/sign-up')} />
      <Button title="Continue as guest" onPress={() => router.replace('/home')} />
    </PlaceholderScreen>
  );
}
