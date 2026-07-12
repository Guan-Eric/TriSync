import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { useSessions } from '@/lib/SessionsContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { getSession } from '@/lib/userData';
import { syncSessionToWearables } from '@/lib/wearables';
import type { AthleteSession, LogStatus } from '@/lib/types';
import { Screen, Card, DisciplineBadge } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

const options: { id: Exclude<LogStatus, null>; label: string; hint: string }[] = [
  { id: 'easy', label: 'Felt easy', hint: 'Could have done more' },
  { id: 'on_target', label: 'On target', hint: 'As prescribed' },
  { id: 'hard', label: 'Hard', hint: 'Tough but completed' },
  { id: 'missed', label: 'Missed', hint: 'Life happened — that is data' },
];

export default function LogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { isPro } = useSubscription();
  const { log } = useSessions();
  const [session, setSession] = useState<AthleteSession | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    getSession(user.uid, id).then(setSession);
  }, [user?.uid, id]);

  if (!session) {
    return (
      <Screen className="items-center justify-center">
        <Stack.Screen options={{ title: 'Log session' }} />
        <ActivityIndicator color="#e23d28" />
      </Screen>
    );
  }

  const canSync =
    isPro &&
    (profile?.garminConnected || profile?.appleHealthConnected || profile?.stravaConnected);
  const prescriptionLocked = !isPro && session.weekNumber > 1;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'How did it go?' }} />
      <DisciplineBadge discipline={session.discipline} />
      <Text variant="title" className="mt-3 mb-2">
        {prescriptionLocked ? `${session.discipline} session` : session.title}
      </Text>
      <Card className="mb-4">
        <Text variant="label" className="mb-1">
          Prescription
        </Text>
        {prescriptionLocked ? (
          <View className="gap-3">
            <Text variant="caption">
              Logging is free. Unlock Pro to see the full prescription for week {session.weekNumber}.
            </Text>
            <Button title="Unlock full plan" variant="secondary" onPress={() => router.push('/paywall')} />
          </View>
        ) : (
          <Text>{session.prescription}</Text>
        )}
      </Card>
      <Text variant="caption" className="mb-4">
        Honest logging beats perfect weeks. Missed sessions help the plan adapt.
      </Text>

      <View className="gap-3">
        {options.map((opt) => (
          <Button
            key={opt.id}
            title={`${opt.label} — ${opt.hint}`}
            variant={session.logStatus === opt.id ? 'default' : 'outline'}
            disabled={busy}
            onPress={async () => {
              try {
                setBusy(true);
                await log(session.id, opt.id);
                const updated = { ...session, logStatus: opt.id };
                if (canSync && opt.id !== 'missed') {
                  const results = await syncSessionToWearables(updated);
                  const failed = results.filter((r) => !r.ok);
                  if (failed.length) {
                    Alert.alert(
                      'Logged — sync issues',
                      failed.map((f) => `${f.id}: ${f.detail}`).join('\n')
                    );
                  }
                }
                router.back();
              } catch (e: unknown) {
                Alert.alert('Log failed', e instanceof Error ? e.message : 'Unknown error');
              } finally {
                setBusy(false);
              }
            }}
          />
        ))}

        {canSync ? (
          <Button
            title="Push workout to devices"
            variant="secondary"
            disabled={busy}
            onPress={async () => {
              try {
                setBusy(true);
                const results = await syncSessionToWearables(session);
                const ok = results.filter((r) => r.ok).map((r) => r.id);
                const failed = results.filter((r) => !r.ok);
                Alert.alert(
                  'Sync',
                  [
                    ok.length ? `Sent: ${ok.join(', ')}` : 'Nothing sent',
                    ...failed.map((f) => `${f.id}: ${f.detail}`),
                  ].join('\n')
                );
              } catch (e: unknown) {
                Alert.alert('Sync failed', e instanceof Error ? e.message : 'Unknown error');
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}
