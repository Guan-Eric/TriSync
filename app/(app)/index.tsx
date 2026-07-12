import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { formatISO } from 'date-fns';
import { router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { useSessions } from '@/lib/SessionsContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { sessionByDate } from '@/lib/plans';
import { Screen, Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SessionRow } from '@/components/SessionRow';
import { CatchUpSheet } from '@/components/CatchUpSheet';

export default function TodayScreen() {
  const { profile } = useAuth();
  const {
    sessions,
    loading,
    needsCatchUp,
    missedThisWeek,
    applyCatchUpPlan,
    dismissCatchUp,
  } = useSessions();
  const { isPro } = useSubscription();
  const [showCatchUp, setShowCatchUp] = useState(false);
  const today = formatISO(new Date(), { representation: 'date' });

  const todays = useMemo(() => sessionByDate(sessions, today), [sessions, today]);

  useEffect(() => {
    if (needsCatchUp && isPro) setShowCatchUp(true);
    else setShowCatchUp(false);
  }, [needsCatchUp, isPro]);

  if (loading) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color="#e23d28" />
      </Screen>
    );
  }

  return (
    <Screen className="pt-14">
      <Text variant="label" className="mb-1">
        Today
      </Text>
      <Text variant="display" className="mb-1">
        What to do
      </Text>
      <Text variant="caption" className="mb-6">
        {profile?.raceDistance
          ? `${profile.raceDistance.toUpperCase()} · race ${profile.raceDate ?? 'TBD'}`
          : 'Your next sessions'}
      </Text>

      <ScrollView contentContainerClassName="gap-3 pb-10">
        {todays.length === 0 ? (
          <Card>
            <Text className="text-lg font-semibold">Rest or mobility day</Text>
            <Text variant="caption" className="mt-1">
              No prescribed key session today. Protect recovery — adaptation is part of the plan.
            </Text>
          </Card>
        ) : (
          todays.map((session) => {
            const locked = !isPro && session.weekNumber > 1;
            return (
              <View key={session.id} className="gap-2">
                <SessionRow
                  session={session}
                  locked={locked}
                  onPress={() => router.push(`/log/${session.id}`)}
                />
                {!locked ? (
                  <Card className="bg-muted/60">
                    <Text variant="label" className="mb-1">
                      Why this matters
                    </Text>
                    <Text>{session.whyItMatters}</Text>
                  </Card>
                ) : (
                  <Button
                    title="Unlock full prescription"
                    variant="ghost"
                    onPress={() => router.push('/paywall')}
                  />
                )}
              </View>
            );
          })
        )}

        {!isPro ? (
          <Button
            title="Unlock full plan"
            variant="secondary"
            onPress={() => router.push('/paywall')}
            className="mt-2"
          />
        ) : null}
      </ScrollView>

      <CatchUpSheet
        visible={showCatchUp}
        missedCount={missedThisWeek}
        onDismiss={async () => {
          setShowCatchUp(false);
          await dismissCatchUp();
        }}
        onApply={async () => {
          await applyCatchUpPlan();
          setShowCatchUp(false);
        }}
      />
    </Screen>
  );
}
