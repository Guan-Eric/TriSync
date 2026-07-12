import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { addDays, format, formatISO, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import { useSessions } from '@/lib/SessionsContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SessionRow } from '@/components/SessionRow';
import type { AthleteSession } from '@/lib/types';

export default function WeekScreen() {
  const { sessions, loading } = useSessions();
  const { isPro } = useSubscription();

  const days = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const key = formatISO(date, { representation: 'date' });
      const daySessions = sessions
        .filter((s) => s.scheduledDate === key && s.discipline !== 'rest')
        .sort((a, b) => a.discipline.localeCompare(b.discipline));
      return { key, date, sessions: daySessions };
    });
  }, [sessions]);

  if (loading) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color="#e23d28" />
      </Screen>
    );
  }

  const hasAny = days.some((d) => d.sessions.length > 0);

  return (
    <Screen className="pt-14">
      <Text variant="label" className="mb-1">
        This week
      </Text>
      <Text variant="display" className="mb-2">
        Swim · Bike · Run · Brick
      </Text>
      <Text variant="caption" className="mb-6">
        Cross-discipline load is intentional — bricks are first-class, not an afterthought.
      </Text>

      <ScrollView contentContainerClassName="gap-5 pb-10">
        {days.map((day) => (
          <View key={day.key} className="gap-2">
            <Text variant="label">{format(day.date, 'EEEE, MMM d')}</Text>
            {day.sessions.length === 0 ? (
              <Text variant="caption">Rest / mobility</Text>
            ) : (
              day.sessions.map((session: AthleteSession) => {
                const locked = !isPro && session.weekNumber > 1;
                return (
                  <View key={session.id} className="gap-1">
                    <SessionRow
                      session={session}
                      locked={locked}
                      onPress={() => router.push(`/log/${session.id}`)}
                    />
                    {locked ? (
                      <Button
                        title="Unlock prescription"
                        variant="ghost"
                        onPress={() => router.push('/paywall')}
                      />
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ))}
        {!hasAny ? (
          <View>
            <Text variant="caption">No sessions scheduled this week yet.</Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
