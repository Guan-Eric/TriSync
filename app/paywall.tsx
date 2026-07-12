import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import Purchases from 'react-native-purchases';
import { router, Stack } from 'expo-router';
import { useSubscription } from '@/lib/SubscriptionContext';
import { getRevenueCatApiKey } from '@/lib/revenuecat';
import { Screen, Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

export default function PaywallScreen() {
  const { isPro, refresh, unlockDemoPro } = useSubscription();
  const [ready, setReady] = useState(false);
  const [Paywall, setPaywall] = useState<React.ComponentType<{
    onPurchaseCompleted?: () => void;
    onRestoreCompleted?: () => void;
    onDismiss?: () => void;
  }> | null>(null);
  const hasKey = Boolean(getRevenueCatApiKey());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ui = await import('react-native-purchases-ui');
        if (mounted) setPaywall(() => ui.default.Paywall);
      } catch {
        // Native paywall unavailable in Expo Go
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const demoUnlock = (
    <Button
      title="Unlock Pro (local demo)"
      className="mb-3"
      onPress={async () => {
        await unlockDemoPro();
        router.back();
      }}
    />
  );

  if (!ready) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color="#e23d28" />
      </Screen>
    );
  }

  if (isPro) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'TriSync Pro' }} />
        <Card>
          <Text className="text-lg font-semibold">You&apos;re on Pro</Text>
          <Text variant="caption" className="mt-2">
            Full plan access, adaptive catch-up, and Garmin workout push are unlocked.
          </Text>
        </Card>
        <Button title="Done" className="mt-4" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!hasKey || !Paywall) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'TriSync Pro' }} />
        <Text variant="title" className="mb-3">
          TriSync Pro
        </Text>
        <Card className="mb-4">
          <Text className="mb-2 font-semibold">Weekly & yearly</Text>
          <Text variant="caption">
            Weekly includes a 7-day trial. Yearly fits a full training cycle. Use a native
            development build for live RevenueCat paywalls, or unlock Pro locally to explore.
          </Text>
        </Card>
        {demoUnlock}
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'TriSync Pro' }} />
      <Paywall
        onPurchaseCompleted={async () => {
          await refresh();
          router.back();
        }}
        onRestoreCompleted={async () => {
          await refresh();
          router.back();
        }}
        onDismiss={() => router.back()}
      />
      <View className="px-5 pb-8">
        {demoUnlock}
        <Button
          title="Restore purchases"
          variant="ghost"
          onPress={async () => {
            try {
              await Purchases.restorePurchases();
              await refresh();
              Alert.alert('Restored', 'Subscription status updated.');
            } catch (e: unknown) {
              Alert.alert('Restore failed', e instanceof Error ? e.message : 'Unknown error');
            }
          }}
        />
      </View>
    </View>
  );
}
