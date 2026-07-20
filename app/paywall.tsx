import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '@/lib/SubscriptionContext';
import { canUseRevenueCat, getPurchasesClient, restorePurchases } from '@/lib/revenuecat';
import { colors } from '@/lib/theme';
import { Animated, heroEntering, popEntering, riseEntering } from '@/lib/motion';
import { Screen, Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

const PRIVACY_URL = 'https://guan-eric.github.io/trisync-legal/privacy/';
const TERMS_URL = 'https://guan-eric.github.io/trisync-legal/terms/';

const FEATURES = [
  { label: 'Full plan', bg: 'bg-swim/25', text: 'text-swim' },
  { label: 'Catch-up', bg: 'bg-bike/25', text: 'text-bike' },
  { label: 'Watch sync', bg: 'bg-run/25', text: 'text-run' },
  { label: 'Strava', bg: 'bg-brick/25', text: 'text-brick' },
] as const;

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

function isHighlighted(pkg: PurchasesPackage) {
  return pkg.packageType === 'ANNUAL';
}

function LegalLinks() {
  return (
    <Text variant="caption" className="text-center text-muted-foreground">
      <Text
        variant="caption"
        className="text-muted-foreground"
        onPress={() => Linking.openURL(PRIVACY_URL)}
      >
        Privacy Policy
      </Text>
      {' · '}
      <Text
        variant="caption"
        className="text-muted-foreground"
        onPress={() => Linking.openURL(TERMS_URL)}
      >
        Terms of Use
      </Text>
    </Text>
  );
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { isPro, refresh } = useSubscription();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasKey = canUseRevenueCat();

  const loadOfferings = useCallback(async () => {
    const client = await getPurchasesClient();
    if (!client) {
      setOffering(null);
      setLoadError('Purchases are unavailable in this build.');
      return null;
    }
    try {
      const offerings = await client.getOfferings();
      const current = offerings.current ?? null;
      setOffering(current);
      if (!current?.availablePackages?.length) {
        setLoadError(
          'Subscription options could not be loaded. Check your connection and try again. If this continues, the App Store products may not be available yet.'
        );
      } else {
        setLoadError(null);
      }
      return current;
    } catch (e: unknown) {
      setOffering(null);
      setLoadError(e instanceof Error ? e.message : 'Could not load subscription options.');
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!hasKey) {
          setLoadError(
            'Purchases are not configured for this build. Use a production or TestFlight build with StoreKit products.'
          );
          return;
        }
        await loadOfferings();
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
      Alert.alert('Unavailable', 'Purchases require a native App Store build.');
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

  const retryLoad = async () => {
    setBusy('reload');
    setLoadError(null);
    try {
      await loadOfferings();
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
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
  };

  if (!ready) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (isPro) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'TriSync Pro', headerStyle: { backgroundColor: colors.background } }} />
        <Card className="border-primary/30 bg-primary/10">
          <Text className="text-lg font-semibold text-primary">You&apos;re on Pro</Text>
          <Text variant="caption" className="mt-2">
            Full plan access, adaptive catch-up, and device sync are unlocked.
          </Text>
        </Card>
        <Button title="Done" className="mt-4" onPress={() => router.back()} />
      </Screen>
    );
  }

  const packages = offering?.availablePackages ?? [];
  const ordered = [...packages].sort((a, b) => {
    if (a.packageType === 'ANNUAL') return -1;
    if (b.packageType === 'ANNUAL') return 1;
    return 0;
  });

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: 'TriSync Pro',
          headerTransparent: true,
          headerTintColor: '#ffffff',
          headerTitleStyle: { color: '#ffffff' },
        }}
      />
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
        <Animated.View entering={heroEntering}>
          <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primarySoft, '#ffb347']}
            locations={[0, 0.35, 0.72, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 20, paddingTop: insets.top + 56, paddingBottom: 28 }}
          >
            <Text variant="label" className="mb-2 text-white/80">
              TriSync Pro
            </Text>
            <Text variant="display" className="mb-3 text-white" style={{ fontSize: 52, lineHeight: 54 }}>
              Train the whole race
            </Text>
            <Text className="max-w-[340px] text-base leading-6 text-white/95">
              Full multi-week plan, adaptive catch-up, and device sync. Logging stays free.
            </Text>

            <View className="mt-5 flex-row flex-wrap gap-2">
              {FEATURES.map((f) => (
                <View key={f.label} className={`rounded-full px-3 py-1.5 ${f.bg}`}>
                  <Text className={`text-xs ${f.text}`} style={{ fontFamily: 'Barlow_600SemiBold' }}>
                    {f.label}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={riseEntering.delay(80)} className="gap-3 px-5 pt-5">
          <Card className="border-primary/20 bg-card" enterDelay={120}>
            <Text className="mb-3 font-semibold text-primary">What you get</Text>
            <View className="gap-2">
              <Text variant="caption" className="text-foreground">
                · Full curated plan beyond week 1
              </Text>
              <Text variant="caption" className="text-foreground">
                · Adaptive catch-up after rough weeks
              </Text>
              <Text variant="caption" className="text-foreground">
                · Apple Watch templates + Strava import
              </Text>
            </View>
          </Card>

          {ordered.length ? (
            <View className="gap-3">
              {ordered.map((pkg, i) => {
                const hot = isHighlighted(pkg);
                return (
                  <Animated.View key={pkg.identifier} entering={popEntering(160 + i * 70)}>
                    <Pressable disabled={busy !== null} onPress={() => purchasePackage(pkg)}>
                      {hot ? (
                        <LinearGradient
                          colors={[colors.primary, colors.primarySoft]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            borderRadius: 16,
                            padding: 18,
                            opacity: busy === pkg.identifier ? 0.6 : 1,
                          }}
                        >
                          <View className="mb-2 self-start rounded-full bg-white/25 px-2.5 py-1">
                            <Text
                              className="text-xs text-white"
                              style={{ fontFamily: 'Barlow_600SemiBold' }}
                            >
                              BEST VALUE
                            </Text>
                          </View>
                          <Text
                            className="text-2xl text-white"
                            style={{ fontFamily: 'Barlow_700Bold' }}
                          >
                            {packageLabel(pkg)}
                          </Text>
                          <Text className="mt-1 text-sm text-white/90">{packageHint(pkg)}</Text>
                        </LinearGradient>
                      ) : (
                        <Card
                          animate={false}
                          className={`border-2 border-primary/35 bg-primary/5 ${
                            busy === pkg.identifier ? 'opacity-60' : ''
                          }`}
                        >
                          <Text className="text-lg font-semibold text-primary">
                            {packageLabel(pkg)}
                          </Text>
                          <Text variant="caption" className="mt-1">
                            {packageHint(pkg)}
                          </Text>
                        </Card>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <Card className="border-primary/25 bg-primary/5" enterDelay={160}>
              <Text variant="caption">
                {loadError ?? 'Subscription options are unavailable right now.'}
              </Text>
              {hasKey ? (
                <Button
                  title={busy === 'reload' ? 'Retrying…' : 'Try again'}
                  variant="secondary"
                  className="mt-3"
                  disabled={busy !== null}
                  onPress={retryLoad}
                />
              ) : null}
            </Card>
          )}

          <Button
            title="Restore purchases"
            variant="outline"
            disabled={busy !== null || !hasKey}
            onPress={restore}
          />
          <LegalLinks />
          <Button title="Close" variant="ghost" onPress={() => router.back()} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}
