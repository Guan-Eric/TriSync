import { addDays, formatISO, parseISO } from 'date-fns';
import type { AthleteSession, UserProfile } from '@/lib/types';
import * as Garmin from './garmin';
import * as AppleHealth from './healthkit';
import * as Strava from './strava';

export type WearableId = 'garmin' | 'apple' | 'strava';

export type WearableStatus = {
  garmin: boolean;
  apple: boolean;
  strava: boolean;
};

export async function getWearableStatus(profile?: UserProfile): Promise<WearableStatus> {
  const [garmin, apple, strava] = await Promise.all([
    Garmin.isGarminConnected(profile),
    AppleHealth.isAppleHealthConnected(),
    Strava.isStravaConnected(),
  ]);
  return { garmin, apple, strava };
}

export async function syncSessionToWearables(session: AthleteSession, profile?: UserProfile) {
  const status = await getWearableStatus(profile);
  const results: { id: WearableId; ok: boolean; detail?: string }[] = [];

  if (status.garmin) {
    try {
      const id = await Garmin.pushSessionToGarmin(session);
      results.push({ id: 'garmin', ok: true, detail: id });
    } catch (e) {
      results.push({
        id: 'garmin',
        ok: false,
        detail: e instanceof Error ? e.message : 'Failed',
      });
    }
  }

  if (status.apple) {
    try {
      await AppleHealth.pushSessionToAppleHealth(session);
      results.push({ id: 'apple', ok: true });
    } catch (e) {
      results.push({
        id: 'apple',
        ok: false,
        detail: e instanceof Error ? e.message : 'Failed',
      });
    }
  }

  if (status.strava && session.logStatus && session.logStatus !== 'missed') {
    try {
      const id = await Strava.pushSessionToStrava(session);
      results.push({ id: 'strava', ok: true, detail: id });
    } catch (e) {
      results.push({
        id: 'strava',
        ok: false,
        detail: e instanceof Error ? e.message : 'Failed',
      });
    }
  }

  return results;
}

/** Push prescribed workouts for upcoming days that are not yet on Garmin. */
export async function pushUpcomingGarminWorkouts(
  sessions: AthleteSession[],
  profile?: UserProfile,
  opts?: { daysAhead?: number; limit?: number }
) {
  const connected = await Garmin.isGarminConnected(profile);
  if (!connected) return [];

  const today = formatISO(new Date(), { representation: 'date' });
  const end = formatISO(addDays(new Date(), opts?.daysAhead ?? 7), { representation: 'date' });
  const limit = opts?.limit ?? 12;

  const targets = sessions
    .filter(
      (s) =>
        !s.garminWorkoutId &&
        s.discipline !== 'rest' &&
        s.scheduledDate >= today &&
        s.scheduledDate <= end
    )
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, limit);

  const results: { sessionId: string; ok: boolean; detail?: string }[] = [];
  for (const session of targets) {
    try {
      const workoutId = await Garmin.pushSessionToGarmin(session);
      results.push({ sessionId: session.id, ok: true, detail: workoutId });
    } catch (e) {
      results.push({
        sessionId: session.id,
        ok: false,
        detail: e instanceof Error ? e.message : 'Failed',
      });
      if (
        e instanceof Error &&
        (e.message.includes('expired') || e.message.includes('not connected'))
      ) {
        break;
      }
    }
  }

  return results;
}

export { Garmin, AppleHealth, Strava };
