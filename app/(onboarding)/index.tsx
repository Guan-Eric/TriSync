import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, formatISO, isBefore, parseISO, startOfDay } from 'date-fns';
import { router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { completeOnboarding } from '@/lib/userData';
import {
  selectPlan,
  suggestedWeeklyHours,
  weeklyHoursGuidance,
  weeklyHoursRangeLabel,
} from '@/content/plans/catalog';
import { computePlanSchedule } from '@/lib/plans';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Screen, Card } from '@/components/ui/Screen';
import { Animated, riseEntering } from '@/lib/motion';
import type { ExperienceLevel, RaceDistance } from '@/lib/types';

const distances: { id: RaceDistance; label: string; blurb: string }[] = [
  { id: 'sprint', label: 'Sprint', blurb: 'Short & sharp — learn the rhythm' },
  { id: 'olympic', label: 'Olympic', blurb: 'Classic middle distance' },
  { id: 'half', label: '70.3', blurb: 'Half Ironman endurance' },
  { id: 'ironman', label: 'Ironman', blurb: 'Full distance patience' },
];

const levels: { id: ExperienceLevel; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
];

function toDateKey(date: Date) {
  return formatISO(date, { representation: 'date' });
}

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [raceDistance, setRaceDistance] = useState<RaceDistance>('olympic');
  const [raceDate, setRaceDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [weeklyHours, setWeeklyHours] = useState('6');
  const [hoursTouched, setHoursTouched] = useState(false);
  const [pool, setPool] = useState(true);
  const [trainer, setTrainer] = useState(true);
  const [outdoorBike, setOutdoorBike] = useState(true);
  const [busy, setBusy] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const pickerValue = raceDate ?? today;

  const schedulePreview = useMemo(() => {
    if (!raceDate) return null;
    const plan = selectPlan(raceDistance, experienceLevel);
    if (!plan) return null;
    return computePlanSchedule(toDateKey(raceDate), plan.weeks, today);
  }, [raceDate, raceDistance, experienceLevel, today]);

  const hoursPlan = useMemo(
    () => selectPlan(raceDistance, experienceLevel),
    [raceDistance, experienceLevel]
  );

  useEffect(() => {
    if (step === 3 && hoursPlan && !hoursTouched) {
      setWeeklyHours(String(suggestedWeeklyHours(hoursPlan)));
    }
  }, [step, hoursPlan, hoursTouched]);

  const title = useMemo(
    () =>
      ['Race distance', 'Race date', 'Experience', 'Weekly hours', 'Equipment'][step],
    [step]
  );

  const canContinue = useMemo(() => {
    if (step === 1) return raceDate !== null;
    if (step === 3) {
      const hours = Number(weeklyHours);
      return Number.isFinite(hours) && hours > 0;
    }
    return true;
  }, [step, raceDate, weeklyHours]);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') return;
    }
    if (!selected) return;
    setRaceDate(startOfDay(selected));
  };

  const goNext = () => {
    if (step === 1 && !raceDate) {
      Alert.alert('Race date', 'Pick your race date to continue.');
      return;
    }
    if (step === 1 && raceDate && isBefore(raceDate, today)) {
      Alert.alert('Race date', 'Choose today or a future race date.');
      return;
    }
    if (step === 3) {
      const hours = Number(weeklyHours);
      if (!Number.isFinite(hours) || hours <= 0) {
        Alert.alert('Weekly hours', 'Enter how many hours you can train each week.');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const finish = async () => {
    if (!user) return;
    if (!raceDate) {
      Alert.alert('Race date', 'Pick your race date to continue.');
      setStep(1);
      return;
    }
    try {
      setBusy(true);
      await completeOnboarding(user.uid, {
        raceDistance,
        raceDate: toDateKey(raceDate),
        experienceLevel,
        weeklyHours: Number(weeklyHours) || 6,
        equipment: { pool, trainer, outdoorBike },
      });
      await refreshProfile();
      router.replace('/(app)');
    } catch (e: unknown) {
      Alert.alert('Onboarding failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen safeBottom>
      <Text variant="label" className="mb-2">
        Step {step + 1} of 5
      </Text>
      <Text variant="display" className="mb-2">
        {title}
      </Text>
      <Text variant="caption" className="mb-6">
        We&apos;ll match a curated plan to your life — not a generic template scaled up.
      </Text>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 pb-8">
        <Animated.View key={step} entering={riseEntering} className="gap-3">
        {step === 0
          ? distances.map((d, i) => (
              <Pressable key={d.id} onPress={() => setRaceDistance(d.id)}>
                <Card
                  enterDelay={i * 50}
                  className={raceDistance === d.id ? 'border-primary' : undefined}
                >
                  <Text className="text-lg font-semibold">{d.label}</Text>
                  <Text variant="caption">{d.blurb}</Text>
                </Card>
              </Pressable>
            ))
          : null}

        {step === 1 ? (
          <Card>
            <Text variant="caption" className="mb-3">
              Target race day
            </Text>
            <Pressable
              onPress={() => setShowPicker(true)}
              className="mb-3 rounded-xl border border-border bg-background px-4 py-3"
            >
              <Text className="text-base font-semibold text-foreground">
                {raceDate ? format(raceDate, 'EEEE, MMM d, yyyy') : 'Tap to choose a date'}
              </Text>
            </Pressable>

            {showPicker ? (
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={today}
                onChange={onDateChange}
                themeVariant="light"
              />
            ) : null}

            {schedulePreview ? (
              <Text variant="caption" className="mt-3">
                Training starts{' '}
                {format(parseISO(schedulePreview.startDate), 'EEEE, MMM d, yyyy')}
                {schedulePreview.weekOffset > 0
                  ? ` · ${schedulePreview.weeksToGenerate} of ${
                      selectPlan(raceDistance, experienceLevel)?.weeks ?? '—'
                    } weeks (race-prep focused)`
                  : ` · full ${selectPlan(raceDistance, experienceLevel)?.weeks ?? '—'} week plan`}
                . Start date is set automatically so the plan ends on race day.
              </Text>
            ) : !raceDate ? (
              <Text variant="caption" className="mt-2 text-primary">
                Select a date before continuing.
              </Text>
            ) : null}
          </Card>
        ) : null}

        {step === 2
          ? levels.map((l) => (
              <Pressable key={l.id} onPress={() => setExperienceLevel(l.id)}>
                <Card className={experienceLevel === l.id ? 'border-primary' : undefined}>
                  <Text className="text-lg font-semibold">{l.label}</Text>
                </Card>
              </Pressable>
            ))
          : null}

        {step === 3 ? (
          <Card>
            <Text variant="caption" className="mb-2">
              Hours you can realistically train each week
            </Text>
            {hoursPlan ? (
              <Text variant="caption" className="mb-3">
                {hoursPlan.name} typically needs {weeklyHoursRangeLabel(hoursPlan)}. Suggested:{' '}
                {suggestedWeeklyHours(hoursPlan)} hrs.
              </Text>
            ) : null}
            <TextInput
              value={weeklyHours}
              onChangeText={(value) => {
                setHoursTouched(true);
                setWeeklyHours(value);
              }}
              keyboardType="number-pad"
              className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
            />
            {hoursPlan && Number(weeklyHours) > 0 ? (
              <Text variant="caption" className="mt-3">
                {weeklyHoursGuidance(Number(weeklyHours), hoursPlan)}
              </Text>
            ) : null}
            {hoursPlan ? (
              <Button
                title={`Use suggested (${suggestedWeeklyHours(hoursPlan)} hrs)`}
                variant="ghost"
                className="mt-2"
                onPress={() => {
                  setHoursTouched(false);
                  setWeeklyHours(String(suggestedWeeklyHours(hoursPlan)));
                }}
              />
            ) : null}
          </Card>
        ) : null}

        {step === 4 ? (
          <View className="gap-3">
            {[
              { label: 'Pool access', value: pool, set: setPool },
              { label: 'Indoor trainer', value: trainer, set: setTrainer },
              { label: 'Outdoor bike', value: outdoorBike, set: setOutdoorBike },
            ].map((item) => (
              <Pressable key={item.label} onPress={() => item.set(!item.value)}>
                <Card className={item.value ? 'border-primary' : undefined}>
                  <Text className="text-lg font-semibold">
                    {item.value ? '✓ ' : ''}
                    {item.label}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        ) : null}
        </Animated.View>
      </ScrollView>

      <View className="gap-3 pb-8">
        {step < 4 ? (
          <Button
            title="Continue"
            onPress={goNext}
            disabled={!canContinue}
            className={!canContinue ? 'opacity-40' : undefined}
          />
        ) : (
          <Button
            title={busy ? 'Building your plan…' : 'Start training'}
            disabled={busy || !raceDate}
            onPress={finish}
          />
        )}
        {step > 0 ? (
          <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} />
        ) : null}
      </View>
    </Screen>
  );
}
