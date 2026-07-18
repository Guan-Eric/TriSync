import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { useSessions } from '@/lib/SessionsContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { useRefreshOnFocus } from '@/lib/useRefreshOnFocus';
import { openCustomerCenter, restorePurchases } from '@/lib/revenuecat';
import { listSessions, setWearableConnected } from '@/lib/userData';
import {
  AppleHealth,
  Strava,
  getWearableStatus,
  pushUpcomingAppleWorkouts,
} from '@/lib/wearables';
import { Screen, Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

export default function SettingsScreen() {
  useRefreshOnFocus();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isPro, refresh } = useSubscription();
  const { syncFromStrava, markAppleScheduled, refresh: refreshSessions } = useSessions();
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
    <Screen>
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
            Send workout templates to Apple Watch, and import activities you post on Strava. Garmin
            Connect arrives in a later release.
          </Text>

          <Text className="mb-2 font-semibold">Garmin</Text>
          <Text variant="caption" className="mb-3">
            Push prescribed workouts to Garmin Connect / your watch. Coming in a later release while
            we finish Garmin developer approval.
          </Text>
          <Button title="Coming in a later release" variant="outline" disabled className="mb-4" />

          <Text className="mb-2 font-semibold">Apple Watch / Health</Text>
          <Text variant="caption" className="mb-3">
            Send prescribed sessions as startable workouts to Fitness / Apple Watch. Requires a
            native build and iOS 17+.
          </Text>
          {wearables.apple || profile?.appleHealthConnected ? (
            <>
              <Button
                title={busy === 'apple-push' ? 'Sending…' : 'Send upcoming workouts to Watch'}
                disabled={busy !== null}
                className="mb-3"
                onPress={() => {
                  if (!user) return;
                  run('apple-push', async () => {
                    const sessions = await listSessions(user.uid);
                    const results = await pushUpcomingAppleWorkouts(sessions, {
                      daysAhead: 7,
                      limit: 12,
                    });
                    for (const r of results.filter((x) => x.ok)) {
                      await markAppleScheduled(r.sessionId);
                    }
                    await refreshSessions({ silent: true });
                    const ok = results.filter((r) => r.ok).length;
                    Alert.alert(
                      'Apple Watch',
                      ok
                        ? `Scheduled ${ok} workout${ok === 1 ? '' : 's'} for Fitness / Watch.`
                        : results[0]?.detail ?? 'Nothing scheduled.'
                    );
                  });
                }}
              />
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
            </>
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
                  const sessions = await listSessions(user.uid);
                  const results = await pushUpcomingAppleWorkouts(sessions);
                  for (const r of results.filter((x) => x.ok)) {
                    await markAppleScheduled(r.sessionId);
                  }
                  await refreshSessions({ silent: true });
                  Alert.alert(
                    'Apple Health connected',
                    'Prescribed workouts can be sent to Fitness / Apple Watch so you can start them there.'
                  );
                });
              }}
            />
          )}

          <Text className="mb-2 font-semibold">Strava</Text>
          <Text variant="caption" className="mb-3">
            Import activities you post on Strava into matching TriSync sessions. TriSync never posts
            to Strava for you.
          </Text>
          {wearables.strava || profile?.stravaConnected ? (
            <>
              <Button
                title={busy === 'strava-sync' ? 'Syncing…' : 'Sync from Strava'}
                disabled={busy !== null}
                className="mb-3"
                onPress={() => {
                  run('strava-sync', async () => {
                    const count = await syncFromStrava();
                    Alert.alert(
                      'Strava sync',
                      count
                        ? `Matched ${count} session${count === 1 ? '' : 's'} from your Strava activities.`
                        : 'No new matching activities found (same day + discipline).'
                    );
                  });
                }}
              />
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
            </>
          ) : (
            <Button
              title={busy === 'strava' ? 'Connecting…' : 'Connect Strava'}
              disabled={busy !== null}
              onPress={() => {
                if (!requirePro() || !user) return;
                run('strava', async () => {
                  await Strava.connectStrava();
                  await setWearableConnected(user.uid, 'stravaConnected', true);
                  const count = await syncFromStrava();
                  Alert.alert(
                    'Strava connected',
                    count
                      ? `Imported ${count} matching session${count === 1 ? '' : 's'}.`
                      : 'Connected. Post on Strava, then tap Sync from Strava.'
                  );
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
