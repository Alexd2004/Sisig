import { Stack } from 'expo-router';

export default function HomeLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Sisig Eh!' }} />
    </Stack>
  );
}
