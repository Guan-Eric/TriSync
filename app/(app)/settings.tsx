import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { useRefreshOnFocus } from '@/lib/useRefreshOnFocus';
import { openCustomerCenter, restorePurchases } from '@/lib/revenuecat';
import { getUserProfile, listSessions, setWearableConnected } from '@/lib/userData';
import { AppleHealth, Garmin, Strava, getWearableStatus, pushUpcomingGarminWorkouts } from '@/lib/wearables';
import { Screen, Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

export default function SettingsScreen() {
  useRefreshOnFocus();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isPro, refresh } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);
  const [wearables, setWearables] = useState({ garmin: false, apple: false, strava: false });

  const refreshWearables = useCallback(async () => {
    setWearables(await getWearableStatus(profile ?? undefined));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void refreshWearables();
    }, [refreshWearables])
  );

  const requirePro = () => {
    if (!isPro) {
      router.push('/paywall');
      return false;
    }
    return true;
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    try {
      setBusy(key);
      await fn();
      await refreshWearables();
      await refreshProfile();
    } catch (e: unknown) {
      Alert.alert('Wearables', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const manageSubscription = async () => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    try {
      setBusy('subscription');
      await openCustomerCenter(async () => {
        await refresh();
      });
      await refresh();
    } catch (e: unknown) {
      Alert.alert(
        'Manage subscription',
        e instanceof Error ? e.message : 'Customer Center unavailable in this build.'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen className="pt-14">
      <Text variant="label" className="mb-1">
        Settings
      </Text>
      <Text variant="display" className="mb-6">
        Account
      </Text>

      <ScrollView contentContainerClassName="gap-3 pb-10">
        <Card>
          <Text className="font-semibold">{profile?.displayName || 'Athlete'}</Text>
          <Text variant="caption">{user?.email || user?.uid}</Text>
          <Text variant="caption" className="mt-2">
            Subscription: {isPro ? 'Pro' : 'Free'}
          </Text>
          {!isPro ? (
            <Text variant="caption" className="mt-1">
              Free includes logging and week 1. Pro unlocks the full plan, catch-up, and device sync.
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text className="mb-1 text-lg font-semibold">Subscription</Text>
          <Text variant="caption" className="mb-4">
            Weekly includes a 7-day trial. Yearly fits a full training cycle. No fake urgency — cancel
            anytime in the App Store.
          </Text>
          <Button
            title={isPro ? 'Manage subscription' : 'See weekly & yearly plans'}
            variant="secondary"
            disabled={busy === 'subscription'}
            onPress={manageSubscription}
            className="mb-3"
          />
          <Button
            title="Restore purchases"
            variant="ghost"
            disabled={busy === 'subscription'}
            onPress={async () => {
              try {
                setBusy('subscription');
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
        </Card>

        <Card>
          <Text className="mb-1 text-lg font-semibold">Devices & sync</Text>
          <Text variant="caption" className="mb-4">
            Push workouts to Garmin, Apple Watch (via Health), and Strava.
            {Garmin.usesGarminCloud()
              ? ' Garmin tokens are stored securely on the server.'
              : ' Local demo mode stores Garmin tokens on-device.'}
          </Text>

          <Text className="mb-2 font-semibold">Garmin</Text>
          <Text variant="caption" className="mb-3">
            Push prescribed workouts to Garmin Connect / your watch.
          </Text>
          {wearables.garmin || profile?.garminConnected ? (
            <Button
              title="Disconnect Garmin"
              variant="outline"
              disabled={busy !== null}
              className="mb-4"
              onPress={() =>
                run('garmin', async () => {
                  if (!user) return;
                  await Garmin.disconnectGarmin();
                  if (!Garmin.usesGarminCloud()) {
                    await setWearableConnected(user.uid, 'garminConnected', false);
                  }
                  await refreshProfile();
                })
              }
            />
          ) : (
            <Button
              title={busy === 'garmin' ? 'Connecting…' : 'Connect Garmin'}
              disabled={busy !== null}
              className="mb-4"
              onPress={() => {
                if (!requirePro() || !user) return;
                run('garmin', async () => {
                  await Garmin.connectGarmin();
                  if (!Garmin.usesGarminCloud()) {
                    await setWearableConnected(user.uid, 'garminConnected', true);
                  }
                  await refreshProfile();
                  const latestProfile = await getUserProfile(user.uid);
                  const sessions = await listSessions(user.uid);
                  const pushed = await pushUpcomingGarminWorkouts(sessions, latestProfile ?? undefined);
                  const ok = pushed.filter((r) => r.ok).length;
                  Alert.alert(
                    'Garmin connected',
                    ok
                      ? `Pushed ${ok} upcoming workout${ok === 1 ? '' : 's'} to Garmin Connect.`
                      : 'Connected. Open Today or a session to push workouts.'
                  );
                });
              }}
            />
          )}

          <Text className="mb-2 font-semibold">Apple Watch / Health</Text>
          <Text variant="caption" className="mb-3">
            Write workouts to Apple Health so they show on Apple Watch. Requires a native development
            build.
          </Text>
          {wearables.apple || profile?.appleHealthConnected ? (
            <Button
              title="Disconnect Apple Health"
              variant="outline"
              disabled={busy !== null}
              className="mb-4"
              onPress={() =>
                run('apple', async () => {
                  if (!user) return;
                  await AppleHealth.disconnectAppleHealth();
                  await setWearableConnected(user.uid, 'appleHealthConnected', false);
                })
              }
            />
          ) : (
            <Button
              title={busy === 'apple' ? 'Connecting…' : 'Connect Apple Health'}
              disabled={busy !== null}
              className="mb-4"
              onPress={() => {
                if (!requirePro() || !user) return;
                run('apple', async () => {
                  await AppleHealth.connectAppleHealth();
                  await setWearableConnected(user.uid, 'appleHealthConnected', true);
                  Alert.alert('Apple Health connected', 'Completed sessions can sync to Health / Watch.');
                });
              }}
            />
          )}

          <Text className="mb-2 font-semibold">Strava</Text>
          <Text variant="caption" className="mb-3">
            Post completed sessions as manual activities.
          </Text>
          {wearables.strava || profile?.stravaConnected ? (
            <Button
              title="Disconnect Strava"
              variant="outline"
              disabled={busy !== null}
              onPress={() =>
                run('strava', async () => {
                  if (!user) return;
                  await Strava.disconnectStrava();
                  await setWearableConnected(user.uid, 'stravaConnected', false);
                })
              }
            />
          ) : (
            <Button
              title={busy === 'strava' ? 'Connecting…' : 'Connect Strava'}
              disabled={busy !== null}
              onPress={() => {
                if (!requirePro() || !user) return;
                run('strava', async () => {
                  await Strava.connectStrava();
                  await setWearableConnected(user.uid, 'stravaConnected', true);
                  Alert.alert('Strava connected', 'Completed sessions can post to Strava.');
                });
              }}
            />
          )}
        </Card>

        <Button
          title="Sign out"
          variant="ghost"
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/sign-in');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
