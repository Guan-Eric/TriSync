import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { addMinutes, parseISO } from 'date-fns';
import type { AthleteSession, Discipline } from '@/lib/types';

const FLAG_KEY = 'trisync.healthkit.connected';

export async function isAppleHealthConnected() {
  return (await SecureStore.getItemAsync(FLAG_KEY)) === '1';
}

export async function disconnectAppleHealth() {
  await SecureStore.deleteItemAsync(FLAG_KEY);
}

function mapActivity(discipline: Discipline) {
  // Numeric values match WorkoutActivityType in @kingstinct/react-native-healthkit
  switch (discipline) {
    case 'swim':
      return 46; // swimming
    case 'bike':
      return 13; // cycling
    case 'run':
      return 37; // running
    case 'brick':
      return 82; // swimBikeRun
    default:
      return 3000; // other
  }
}

export async function connectAppleHealth() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Health / Watch sync is only available on iOS.');
  }

  try {
    const HealthKit = await import('@kingstinct/react-native-healthkit');
    const available = await HealthKit.isHealthDataAvailable();
    if (!available) {
      throw new Error('HealthKit is not available on this device (use a physical iPhone).');
    }

    await HealthKit.requestAuthorization({
      toShare: [HealthKit.WorkoutTypeIdentifier],
      toRead: [HealthKit.WorkoutTypeIdentifier],
    });

    await SecureStore.setItemAsync(FLAG_KEY, '1');
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('Native module') || message.includes('Nitro') || message.includes('Expo Go')) {
      throw new Error(
        'Apple Health needs a development build (npx expo run:ios). It does not work in Expo Go.'
      );
    }
    throw e instanceof Error ? e : new Error(message);
  }
}

export async function pushSessionToAppleHealth(session: AthleteSession) {
  if (!(await isAppleHealthConnected())) {
    throw new Error('Apple Health is not connected.');
  }

  const HealthKit = await import('@kingstinct/react-native-healthkit');
  const start = parseISO(`${session.scheduledDate}T08:00:00`);
  const end = addMinutes(start, session.durationMinutes || 30);

  await HealthKit.saveWorkoutSample(
    mapActivity(session.discipline) as never,
    [],
    start,
    end,
    undefined,
    {
      HKMetadataKeyWorkoutBrandName: 'TriSync',
      TriSyncSessionId: session.id,
      TriSyncPrescription: session.prescription,
      TriSyncWhy: session.whyItMatters,
    }
  );

  return true;
}
