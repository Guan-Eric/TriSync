import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { router, Stack } from 'expo-router';
import { useSubscription } from '@/lib/SubscriptionContext';
import {
  canUseRevenueCat,
  ENTITLEMENT_ID,
  getPurchasesClient,
  getRevenueCatApiKey,
  restorePurchases,
} from '@/lib/revenuecat';
import { Screen, Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

type PaywallComponent = React.ComponentType<{
  onPurchaseCompleted?: () => void;
  onRestoreCompleted?: () => void;
  onDismiss?: () => void;
}>;

function packageLabel(pkg: PurchasesPackage) {
  const product = pkg.product;
  const price = product.priceString;
  if (pkg.packageType === 'WEEKLY') return `Weekly · ${price}`;
  if (pkg.packageType === 'ANNUAL') return `Yearly · ${price}`;
  return `${product.title} · ${price}`;
}

function packageHint(pkg: PurchasesPackage) {
  const intro = pkg.product.introPrice;
  if (pkg.packageType === 'WEEKLY' && intro) {
    return `${intro.periodNumberOfUnits}-day trial, then ${pkg.product.priceString}/week`;
  }
  if (pkg.packageType === 'ANNUAL') {
    return 'Best value for a full training cycle';
  }
  return pkg.product.description || 'Unlock the full curated plan';
}

export default function PaywallScreen() {
  const { isPro, refresh, unlockDemoPro } = useSubscription();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [Paywall, setPaywall] = useState<PaywallComponent | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const hasKey = canUseRevenueCat();

  const loadOfferings = useCallback(async () => {
    const client = await getPurchasesClient();
    if (!client) return null;
    const offerings = await client.getOfferings();
    const current = offerings.current ?? null;
    setOffering(current);
    return current;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (hasKey) {
          const ui = await import('react-native-purchases-ui');
          if (mounted) setPaywall(() => ui.default.Paywall);
          await loadOfferings();
        }
      } catch {
        // Native paywall unavailable in Expo Go
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [hasKey, loadOfferings]);

  const onPurchaseSuccess = useCallback(async () => {
    await refresh();
    router.back();
  }, [refresh]);

  const purchasePackage = async (pkg: PurchasesPackage) => {
    const client = await getPurchasesClient();
    if (!client) {
      Alert.alert('Unavailable', 'Purchases require a native development build.');
      return;
    }
    try {
      setBusy(pkg.identifier);
      await client.purchasePackage(pkg);
      await onPurchaseSuccess();
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err.userCancelled) {
        Alert.alert('Purchase failed', err.message ?? 'Unknown error');
      }
    } finally {
      setBusy(null);
    }
  };

  const demoUnlock =
    __DEV__ && !getRevenueCatApiKey() ? (
      <Button
        title="Unlock Pro (local demo)"
        className="mb-3"
        onPress={async () => {
          await unlockDemoPro();
          router.back();
        }}
      />
    ) : null;

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
    const packages = offering?.availablePackages ?? [];
    return (
      <Screen>
        <Stack.Screen options={{ title: 'TriSync Pro' }} />
        <ScrollView contentContainerClassName="gap-3 pb-10">
          <Text variant="title" className="mb-1">
            TriSync Pro
          </Text>
          <Text variant="caption" className="mb-2">
            Full multi-week plan, adaptive catch-up, and device sync. Logging stays free.
          </Text>

          <Card>
            <Text className="mb-2 font-semibold">What you get</Text>
            <Text variant="caption">
              · Full curated plan beyond week 1{'\n'}· Adaptive catch-up after rough weeks{'\n'}·
              Garmin, Apple Health, and Strava sync
            </Text>
          </Card>

          {packages.length ? (
            <View className="gap-2">
              {packages.map((pkg) => (
                <Pressable
                  key={pkg.identifier}
                  disabled={busy !== null}
                  onPress={() => purchasePackage(pkg)}
                >
                  <Card className={busy === pkg.identifier ? 'opacity-60' : undefined}>
                    <Text className="text-lg font-semibold">{packageLabel(pkg)}</Text>
                    <Text variant="caption" className="mt-1">
                      {packageHint(pkg)}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <Card>
              <Text variant="caption">
                {hasKey
                  ? 'Loading subscription options… rebuild in a native dev client if this persists.'
                  : 'Add REVENUECAT_TEST_API_KEY or REVENUECAT_API_KEY to .env, then use a native development build for live purchases.'}
              </Text>
            </Card>
          )}

          {demoUnlock}
          <Button
            title="Restore purchases"
            variant="secondary"
            disabled={busy !== null || !hasKey}
            onPress={async () => {
              try {
                setBusy('restore');
                await restorePurchases();
                await refresh();
                Alert.alert('Restored', 'Subscription status updated.');
              } catch (e: unknown) {
                Alert.alert('Restore failed', e instanceof Error ? e.message : 'Unknown error');
              } finally {
                setBusy(null);
              }
            }}
          />
          <Button title="Close" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'TriSync Pro' }} />
      <Paywall
        onPurchaseCompleted={onPurchaseSuccess}
        onRestoreCompleted={onPurchaseSuccess}
        onDismiss={() => router.back()}
      />
      <View className="px-5 pb-8">
        {demoUnlock}
        <Button
          title="Restore purchases"
          variant="ghost"
          disabled={busy !== null}
          onPress={async () => {
            try {
              setBusy('restore');
              await restorePurchases();
              await refresh();
              Alert.alert('Restored', 'Subscription status updated.');
            } catch (e: unknown) {
              Alert.alert('Restore failed', e instanceof Error ? e.message : 'Unknown error');
            } finally {
              setBusy(null);
            }
          }}
        />
        <Text variant="caption" className="mt-2 text-center">
          Entitlement: {ENTITLEMENT_ID}
        </Text>
      </View>
    </View>
  );
}
