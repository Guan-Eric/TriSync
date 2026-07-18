import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { parseISO } from 'date-fns';
import type { AthleteSession, Discipline } from '@/lib/types';

const FLAG_KEY = 'trisync.healthkit.connected';

export async function isAppleHealthConnected() {
  return (await SecureStore.getItemAsync(FLAG_KEY)) === '1';
}

export async function disconnectAppleHealth() {
  await SecureStore.deleteItemAsync(FLAG_KEY);
}

function mapActivity(discipline: Discipline): 'swimming' | 'cycling' | 'running' {
  switch (discipline) {
    case 'swim':
      return 'swimming';
    case 'bike':
      return 'cycling';
    case 'run':
    case 'brick':
    default:
      return 'running';
  }
}

function dateComponents(scheduledDate: string) {
  const d = parseISO(`${scheduledDate}T08:00:00`);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: 8,
    minute: 0,
  };
}

async function loadWorkouts() {
  return import('react-native-workouts');
}

/**
 * Connect Apple Health / WorkoutKit so TriSync can send prescribed workouts
 * the athlete can start from iPhone Fitness or Apple Watch.
 */
export async function connectAppleHealth() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Health / Watch sync is only available on iOS.');
  }

  try {
    const Workouts = await loadWorkouts();
    if (!Workouts.default.isAvailable) {
      throw new Error('Health / WorkoutKit is not available on this device (use a physical iPhone).');
    }

    const status = await Workouts.default.requestAuthorization();
    if (status === 'denied') {
      throw new Error('WorkoutKit permission denied. Enable Health access for TriSync in Settings.');
    }

    // Also request classic HealthKit workout share so completed Watch workouts can be read later.
    try {
      const HealthKit = await import('@kingstinct/react-native-healthkit');
      if (await HealthKit.isHealthDataAvailable()) {
        await HealthKit.requestAuthorization({
          toShare: [],
          toRead: [HealthKit.WorkoutTypeIdentifier],
        });
      }
    } catch {
      // WorkoutKit alone is enough to schedule templates.
    }

    await SecureStore.setItemAsync(FLAG_KEY, '1');
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (
      message.includes('Native module') ||
      message.includes('Nitro') ||
      message.includes('Expo Go') ||
      message.includes('Cannot find module')
    ) {
      throw new Error(
        'Apple Watch workouts need a development build (npx expo run:ios). They do not work in Expo Go.'
      );
    }
    throw e instanceof Error ? e : new Error(message);
  }
}

/**
 * Schedule a prescribed TriSync session as a startable WorkoutKit template
 * on Apple Watch / Fitness (iOS 17+). This is not a completed workout log.
 */
export async function pushSessionToAppleHealth(session: AthleteSession) {
  if (!(await isAppleHealthConnected())) {
    throw new Error('Apple Health is not connected.');
  }
  if (session.discipline === 'rest') {
    throw new Error('Rest days are not sent to Apple Watch.');
  }

  const Workouts = await loadWorkouts();
  const minutes = Math.max(10, session.durationMinutes || 30);
  const date = dateComponents(session.scheduledDate);
  const displayName = session.title.slice(0, 60);

  if (session.discipline === 'brick') {
    await Workouts.default.scheduleWorkout(
      {
        activityType: 'cycling',
        locationType: 'outdoor',
        displayName,
        warmup: { goal: { type: 'time', value: Math.max(5, Math.round(minutes * 0.15)), unit: 'minutes' } },
        blocks: [
          {
            iterations: 1,
            steps: [
              {
                purpose: 'work',
                goal: { type: 'time', value: Math.max(10, Math.round(minutes * 0.55)), unit: 'minutes' },
              },
              {
                purpose: 'work',
                goal: { type: 'time', value: Math.max(8, Math.round(minutes * 0.3)), unit: 'minutes' },
              },
            ],
          },
        ],
        cooldown: { goal: { type: 'time', value: 3, unit: 'minutes' } },
      },
      date
    );
    return true;
  }

  await Workouts.default.scheduleSingleGoalWorkout(
    {
      activityType: mapActivity(session.discipline),
      locationType: session.discipline === 'swim' ? 'indoor' : 'outdoor',
      displayName,
      goal: { type: 'time', value: minutes, unit: 'minutes' },
    },
    date
  );

  return true;
}
