import { Stack } from 'expo-router';

export default function OrderLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Place an Order' }} />
    </Stack>
  );
}
