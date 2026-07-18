import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { addDays, format, formatISO, isBefore, parseISO, startOfDay } from 'date-fns';
import { router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { useSessions } from '@/lib/SessionsContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { useRefreshOnFocus } from '@/lib/useRefreshOnFocus';
import {
  getPlanById,
  selectPlan,
  suggestedWeeklyHours,
  weeklyHoursGuidance,
  weeklyHoursRangeLabel,
} from '@/content/plans/catalog';
import { computePlanSchedule } from '@/lib/plans';
import { Screen, Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { PlanCalendar } from '@/components/PlanCalendar';
import type {
  AthleteSession,
  EquipmentAccess,
  ExperienceLevel,
  RaceDistance,
} from '@/lib/types';

const distances: { id: RaceDistance; label: string }[] = [
  { id: 'sprint', label: 'Sprint' },
  { id: 'olympic', label: 'Olympic' },
  { id: 'half', label: '70.3' },
  { id: 'ironman', label: 'Ironman' },
];

const levels: { id: ExperienceLevel; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
];

const equipmentItems: { key: keyof EquipmentAccess; label: string }[] = [
  { key: 'pool', label: 'Pool access' },
  { key: 'trainer', label: 'Indoor trainer' },
  { key: 'outdoorBike', label: 'Outdoor bike' },
];

function distanceLabel(id?: RaceDistance) {
  return distances.find((d) => d.id === id)?.label ?? '—';
}

function levelLabel(id?: ExperienceLevel) {
  return levels.find((l) => l.id === id)?.label ?? '—';
}

function inferEnrollmentStart(sessions: AthleteSession[]) {
  if (!sessions.length) return null;
  const candidates = sessions.map((s) =>
    formatISO(addDays(parseISO(s.scheduledDate), -(s.weekNumber - 1) * 7), {
      representation: 'date',
    })
  );
  return candidates.sort()[0];
}

export default function PlanScreen() {
  useRefreshOnFocus();
  const { profile } = useAuth();
  const { sessions, updateRace, reschedule } = useSessions();
  const { isPro } = useSubscription();
  const plan = profile?.activePlanId ? getPlanById(profile.activePlanId) : undefined;

  const currentStartKey = useMemo(() => inferEnrollmentStart(sessions), [sessions]);

  const [editing, setEditing] = useState(false);
  const [calendarDragging, setCalendarDragging] = useState(false);
  const [raceDistance, setRaceDistance] = useState<RaceDistance>(
    profile?.raceDistance ?? 'olympic'
  );
  const [raceDate, setRaceDate] = useState<Date>(() =>
    profile?.raceDate ? parseISO(profile.raceDate) : startOfDay(new Date())
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile?.experienceLevel ?? 'beginner'
  );
  const [equipment, setEquipment] = useState<EquipmentAccess>({
    pool: profile?.equipment?.pool ?? true,
    trainer: profile?.equipment?.trainer ?? true,
    outdoorBike: profile?.equipment?.outdoorBike ?? true,
  });
  const [weeklyHours, setWeeklyHours] = useState(String(profile?.weeklyHours ?? 6));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [busy, setBusy] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const week1Count = sessions.filter((s) => s.weekNumber === 1 && s.discipline !== 'rest').length;
  const totalCount = sessions.filter((s) => s.discipline !== 'rest').length;

  const editSchedulePreview = useMemo(() => {
    const selected = selectPlan(raceDistance, experienceLevel);
    if (!selected) return null;
    return computePlanSchedule(
      formatISO(raceDate, { representation: 'date' }),
      selected.weeks,
      today
    );
  }, [raceDate, raceDistance, experienceLevel, today]);

  const editPlan = useMemo(
    () => selectPlan(raceDistance, experienceLevel),
    [raceDistance, experienceLevel]
  );

  const parsedWeeklyHours = Number(weeklyHours);

  const openEditor = () => {
    setRaceDistance(profile?.raceDistance ?? 'olympic');
    setRaceDate(profile?.raceDate ? parseISO(profile.raceDate) : startOfDay(new Date()));
    setExperienceLevel(profile?.experienceLevel ?? 'beginner');
    setEquipment({
      pool: profile?.equipment?.pool ?? true,
      trainer: profile?.equipment?.trainer ?? true,
      outdoorBike: profile?.equipment?.outdoorBike ?? true,
    });
    const selected = selectPlan(
      profile?.raceDistance ?? 'olympic',
      profile?.experienceLevel ?? 'beginner'
    );
    setWeeklyHours(
      String(
        profile?.weeklyHours ?? (selected ? suggestedWeeklyHours(selected) : 6)
      )
    );
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

  const toggleEquipment = (key: keyof EquipmentAccess) => {
    setEquipment((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveRace = () => {
    if (isBefore(raceDate, today)) {
      Alert.alert('Race date', 'Choose today or a future race date.');
      return;
    }
    if (!Number.isFinite(parsedWeeklyHours) || parsedWeeklyHours <= 0) {
      Alert.alert('Weekly hours', 'Enter how many hours you can train each week.');
      return;
    }

    const raceDateKey = formatISO(raceDate, { representation: 'date' });
    const planAffectingChange =
      raceDateKey !== profile?.raceDate ||
      raceDistance !== profile?.raceDistance ||
      experienceLevel !== profile?.experienceLevel;

    Alert.alert(
      planAffectingChange ? 'Rebuild schedule?' : 'Save settings?',
      planAffectingChange
        ? "We'll rebuild your upcoming schedule from your race, level, and equipment. Logged workouts stay in history."
        : "We'll update your weekly hours and equipment without changing scheduled sessions.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: planAffectingChange ? 'Rebuild' : 'Save',
          style: planAffectingChange ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setBusy(true);
              await updateRace({
                raceDate: raceDateKey,
                raceDistance,
                experienceLevel,
                equipment,
                weeklyHours: parsedWeeklyHours,
              });
              setEditing(false);
              setSavedMessage(
                planAffectingChange ? 'Plan settings updated.' : 'Weekly hours and equipment saved.'
              );
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
    <Screen>
      <Text variant="label" className="mb-1">
        Active plan
      </Text>
      <Text variant="display" className="mb-6">
        {plan?.name ?? 'No plan'}
      </Text>

      <ScrollView contentContainerClassName="gap-3 pb-10" scrollEnabled={!calendarDragging}>
        <Card>
          <Text variant="label" className="mb-2">
            Race & setup
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
                {levelLabel(profile?.experienceLevel)}
                {currentStartKey
                  ? ` · Starts ${format(parseISO(currentStartKey), 'MMM d, yyyy')}`
                  : ''}
                {` · ${plan?.weeks ?? '—'} week plan · ${totalCount} key sessions`}
              </Text>
              <Text variant="caption">
                Pool: {profile?.equipment?.pool ? 'yes' : 'no'} · Trainer:{' '}
                {profile?.equipment?.trainer ? 'yes' : 'no'} · Outdoor bike:{' '}
                {profile?.equipment?.outdoorBike ? 'yes' : 'no'} · ~{profile?.weeklyHours ?? '—'}{' '}
                hrs/week
                {plan ? ` (plan: ${weeklyHoursRangeLabel(plan)})` : ''}
              </Text>
              {savedMessage ? (
                <Text className="text-sm text-primary">{savedMessage}</Text>
              ) : null}
              <Button title="Edit plan settings" variant="secondary" onPress={openEditor} />
            </View>
          ) : (
            <View className="gap-3">
              <Text variant="caption">
                Changing distance or level picks a matching curated plan. Start date is set
                automatically so training ends on race day.
              </Text>

              <Text variant="label">Race distance</Text>
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

              <Text variant="label">Experience</Text>
              <View className="flex-row flex-wrap gap-2">
                {levels.map((l) => (
                  <Pressable key={l.id} onPress={() => setExperienceLevel(l.id)}>
                    <View
                      className={`rounded-xl border px-3 py-2 ${
                        experienceLevel === l.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      }`}
                    >
                      <Text className="font-semibold">{l.label}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <Text variant="label">Race date</Text>
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

              <Text variant="label">Equipment</Text>
              <View className="gap-2">
                {equipmentItems.map((item) => (
                  <Pressable key={item.key} onPress={() => toggleEquipment(item.key)}>
                    <View
                      className={`rounded-xl border px-3 py-3 ${
                        equipment[item.key]
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      }`}
                    >
                      <Text className="font-semibold">
                        {equipment[item.key] ? '✓ ' : ''}
                        {item.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <Text variant="label">Weekly hours</Text>
              {editPlan ? (
                <Text variant="caption" className="mb-2">
                  {editPlan.name} typically needs {weeklyHoursRangeLabel(editPlan)}. Suggested:{' '}
                  {suggestedWeeklyHours(editPlan)} hrs.
                </Text>
              ) : null}
              <TextInput
                value={weeklyHours}
                onChangeText={setWeeklyHours}
                keyboardType="number-pad"
                className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
              />
              {editPlan && parsedWeeklyHours > 0 ? (
                <Text variant="caption" className="mt-2">
                  {weeklyHoursGuidance(parsedWeeklyHours, editPlan)}
                </Text>
              ) : null}
              {editPlan ? (
                <Button
                  title={`Use suggested (${suggestedWeeklyHours(editPlan)} hrs)`}
                  variant="ghost"
                  className="mt-2"
                  onPress={() => setWeeklyHours(String(suggestedWeeklyHours(editPlan)))}
                />
              ) : null}

              {editSchedulePreview ? (
                <Text variant="caption">
                  Training will start{' '}
                  {format(parseISO(editSchedulePreview.startDate), 'EEEE, MMM d, yyyy')}
                  {editSchedulePreview.weekOffset > 0
                    ? ` · ${editSchedulePreview.weeksToGenerate}-week race-prep schedule`
                    : ` · full ${selectPlan(raceDistance, experienceLevel)?.weeks ?? '—'} week plan`}
                  .
                </Text>
              ) : null}

              <Button
                title={busy ? 'Saving…' : 'Save settings'}
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

        <View className="mt-2 gap-2">
          <Text variant="label">Full schedule</Text>
          <Text className="mb-1 text-lg font-semibold">Week by week</Text>
          <PlanCalendar
            sessions={sessions}
            isPro={isPro}
            onReschedule={reschedule}
            onDraggingChange={setCalendarDragging}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
