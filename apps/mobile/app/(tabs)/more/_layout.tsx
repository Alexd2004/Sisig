import { Stack } from 'expo-router';

export default function MoreLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'More' }} />
    </Stack>
  );
}
