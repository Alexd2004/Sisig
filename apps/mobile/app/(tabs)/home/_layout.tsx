import { Stack } from 'expo-router';
import { useStackScreenOptions } from '../../../src/navigation/stack-options';

export default function HomeLayout(): JSX.Element {
  const screenOptions = useStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Sisig Eh!' }} />
    </Stack>
  );
}
