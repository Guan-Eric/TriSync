import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, formatISO, isBefore, parseISO, startOfDay } from 'date-fns';
import { router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { useSessions } from '@/lib/SessionsContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { getPlanById } from '@/content/plans/catalog';
import { Screen, Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import type { RaceDistance } from '@/lib/types';

const distances: { id: RaceDistance; label: string }[] = [
  { id: 'sprint', label: 'Sprint' },
  { id: 'olympic', label: 'Olympic' },
  { id: 'half', label: '70.3' },
  { id: 'ironman', label: 'Ironman' },
];

function distanceLabel(id?: RaceDistance) {
  return distances.find((d) => d.id === id)?.label ?? '—';
}

export default function PlanScreen() {
  const { profile } = useAuth();
  const { sessions, updateRace } = useSessions();
  const { isPro } = useSubscription();
  const plan = profile?.activePlanId ? getPlanById(profile.activePlanId) : undefined;

  const [editing, setEditing] = useState(false);
  const [raceDistance, setRaceDistance] = useState<RaceDistance>(
    profile?.raceDistance ?? 'olympic'
  );
  const [raceDate, setRaceDate] = useState<Date>(() =>
    profile?.raceDate ? parseISO(profile.raceDate) : startOfDay(new Date())
  );
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [busy, setBusy] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const week1Count = sessions.filter((s) => s.weekNumber === 1 && s.discipline !== 'rest').length;
  const totalCount = sessions.filter((s) => s.discipline !== 'rest').length;

  const openEditor = () => {
    setRaceDistance(profile?.raceDistance ?? 'olympic');
    setRaceDate(profile?.raceDate ? parseISO(profile.raceDate) : startOfDay(new Date()));
    setShowPicker(Platform.OS === 'ios');
    setSavedMessage(null);
    setEditing(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') return;
    }
    if (!selected) return;
    setRaceDate(startOfDay(selected));
  };

  const saveRace = () => {
    if (isBefore(raceDate, today)) {
      Alert.alert('Race date', 'Choose today or a future race date.');
      return;
    }

    Alert.alert(
      'Rebuild schedule?',
      "We'll rebuild your upcoming schedule so training ends on race day. Logged workouts stay in history.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rebuild',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await updateRace({
                raceDate: formatISO(raceDate, { representation: 'date' }),
                raceDistance,
              });
              setEditing(false);
              setSavedMessage('Schedule updated for your race.');
            } catch (e: unknown) {
              Alert.alert('Could not update', e instanceof Error ? e.message : 'Unknown error');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen className="pt-14">
      <Text variant="label" className="mb-1">
        Active plan
      </Text>
      <Text variant="display" className="mb-6">
        {plan?.name ?? 'No plan'}
      </Text>

      <ScrollView contentContainerClassName="gap-3 pb-10">
        <Card>
          <Text variant="label" className="mb-2">
            Race
          </Text>
          {!editing ? (
            <View className="gap-3">
              <Text className="text-lg font-semibold">
                {distanceLabel(profile?.raceDistance)} ·{' '}
                {profile?.raceDate
                  ? format(parseISO(profile.raceDate), 'MMM d, yyyy')
                  : 'Date TBD'}
              </Text>
              <Text variant="caption">
                {plan?.weeks ?? '—'} week plan · {totalCount} key sessions on the calendar
                {plan?.weeks && profile?.raceDate
                  ? ` · ends race week`
                  : ''}
              </Text>
              {savedMessage ? (
                <Text className="text-sm text-primary">{savedMessage}</Text>
              ) : null}
              <Button title="Edit race date or type" variant="secondary" onPress={openEditor} />
            </View>
          ) : (
            <View className="gap-3">
              <Text variant="caption">
                Changing distance picks a new curated plan. Your schedule will end on race day.
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {distances.map((d) => (
                  <Pressable key={d.id} onPress={() => setRaceDistance(d.id)}>
                    <View
                      className={`rounded-xl border px-3 py-2 ${
                        raceDistance === d.id ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      <Text className="font-semibold">{d.label}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setShowPicker(true)}
                className="rounded-xl border border-border bg-background px-4 py-3"
              >
                <Text className="text-base font-semibold text-foreground">
                  {format(raceDate, 'EEEE, MMM d, yyyy')}
                </Text>
              </Pressable>

              {showPicker ? (
                <DateTimePicker
                  value={raceDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={today}
                  onChange={onDateChange}
                  themeVariant="light"
                />
              ) : null}

              <Button
                title={busy ? 'Rebuilding…' : 'Save & rebuild schedule'}
                disabled={busy}
                onPress={saveRace}
              />
              <Button
                title="Cancel"
                variant="ghost"
                disabled={busy}
                onPress={() => setEditing(false)}
              />
            </View>
          )}
        </Card>

        <Card>
          <Text className="mb-2 text-lg font-semibold">Curated, not fake-AI</Text>
          <Text variant="caption">{plan?.description}</Text>
        </Card>

        <Card>
          <Text variant="label" className="mb-2">
            Access
          </Text>
          {isPro ? (
            <Text>
              Pro unlocked — full {plan?.weeks ?? '—'} week plan ({totalCount} key sessions).
            </Text>
          ) : (
            <View className="gap-3">
              <Text>
                Free preview: week 1 ({week1Count} sessions). Logging stays free forever.
              </Text>
              <Button title="See weekly & yearly plans" onPress={() => router.push('/paywall')} />
            </View>
          )}
        </Card>

        <Card>
          <Text variant="label" className="mb-2">
            Constraints we respect
          </Text>
          <Text variant="caption">
            Pool: {profile?.equipment?.pool ? 'yes' : 'no'} · Trainer:{' '}
            {profile?.equipment?.trainer ? 'yes' : 'no'} · Outdoor bike:{' '}
            {profile?.equipment?.outdoorBike ? 'yes' : 'no'} · ~{profile?.weeklyHours ?? '—'}{' '}
            hrs/week
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
