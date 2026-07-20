import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { format, parseISO } from 'date-fns';
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
import { colors } from '@/lib/theme';

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
  const { log, markAppleScheduled, syncFromStrava } = useSessions();
  const [session, setSession] = useState<AthleteSession | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    getSession(user.uid, id).then(setSession);
  }, [user?.uid, id]);

  if (!session) {
    return (
      <Screen className="items-center justify-center">
        <Stack.Screen options={{ title: 'Session' }} />
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const canSendApple = isPro && (profile?.appleHealthConnected || false);
  const canSyncStrava = isPro && (profile?.stravaConnected || false);
  const prescriptionLocked = !isPro && session.weekNumber > 1;
  const blocks = session.blocks?.length ? session.blocks : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Session' }} />
      <ScrollView contentContainerClassName="gap-3 pb-10">
        <DisciplineBadge discipline={session.discipline} />
        <Text variant="title" className="mt-1">
          {prescriptionLocked ? `${session.discipline} session` : session.title}
        </Text>
        <Text variant="caption">
          {format(parseISO(session.scheduledDate), 'EEEE, MMM d')} · {session.durationMinutes} min
          {!prescriptionLocked && session.intensityLabel ? ` · ${session.intensityLabel}` : ''}
          {session.simplified ? ' · Catch-up simplified' : ''}
          {session.stravaActivityId ? ' · Synced from Strava' : ''}
          {session.appleWorkoutScheduled ? ' · On Apple Watch' : ''}
        </Text>

        {prescriptionLocked ? (
          <Card>
            <Text variant="label" className="mb-1">
              Prescription
            </Text>
            <View className="gap-3">
              <Text variant="caption">
                Logging is free. Unlock Pro to see the full session plan for week{' '}
                {session.weekNumber}.
              </Text>
              <Button
                title="Unlock full plan"
                variant="secondary"
                onPress={() => router.push('/paywall')}
              />
            </View>
          </Card>
        ) : (
          <>
            <Card>
              <Text variant="label" className="mb-1">
                Why it matters
              </Text>
              <Text>{session.whyItMatters}</Text>
            </Card>

            {blocks ? (
              blocks.map((block) => (
                <Card key={`${block.label}-${block.detail.slice(0, 24)}`}>
                  <Text variant="label" className="mb-1">
                    {block.label}
                  </Text>
                  <Text>{block.detail}</Text>
                </Card>
              ))
            ) : (
              <Card>
                <Text variant="label" className="mb-1">
                  Prescription
                </Text>
                <Text>{session.prescription}</Text>
              </Card>
            )}

            {session.coachCues ? (
              <Card>
                <Text variant="label" className="mb-1">
                  Coach cues
                </Text>
                <Text>{session.coachCues}</Text>
              </Card>
            ) : null}
          </>
        )}

        <Text variant="caption" className="mt-2">
          Honest logging beats perfect weeks. Missed sessions help the plan adapt.
        </Text>

        <Text variant="label" className="mt-2">
          How did it go?
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
                  router.back();
                } catch (e: unknown) {
                  Alert.alert('Log failed', e instanceof Error ? e.message : 'Unknown error');
                } finally {
                  setBusy(false);
                }
              }}
            />
          ))}

          {canSendApple && !prescriptionLocked ? (
            <Button
              title="Send workout template to Apple Watch"
              variant="secondary"
              disabled={busy}
              onPress={async () => {
                try {
                  setBusy(true);
                  const results = await syncSessionToWearables(session, profile ?? undefined);
                  const apple = results.find((r) => r.id === 'apple');
                  if (apple?.ok) {
                    await markAppleScheduled(session.id);
                    setSession({ ...session, appleWorkoutScheduled: true });
                    Alert.alert(
                      'Sent to Apple Watch',
                      'Open the Workout or Fitness app to start this session from your watch or phone.'
                    );
                  } else {
                    Alert.alert('Apple Watch', apple?.detail ?? 'Could not schedule workout.');
                  }
                } catch (e: unknown) {
                  Alert.alert('Sync failed', e instanceof Error ? e.message : 'Unknown error');
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}

          {canSyncStrava ? (
            <Button
              title="Sync this week from Strava"
              variant="ghost"
              disabled={busy}
              onPress={async () => {
                try {
                  setBusy(true);
                  const count = await syncFromStrava();
                  Alert.alert(
                    'Strava',
                    count
                      ? `Matched ${count} session${count === 1 ? '' : 's'} from Strava.`
                      : 'No new matching activities found.'
                  );
                  if (user && id) setSession(await getSession(user.uid, id));
                } catch (e: unknown) {
                  Alert.alert('Strava sync failed', e instanceof Error ? e.message : 'Unknown error');
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
