import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { router } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen className="items-center justify-center gap-4">
        <Text variant="title">Screen not found</Text>
        <Button title="Go home" onPress={() => router.replace('/')} />
      </Screen>
    </>
  );
}
