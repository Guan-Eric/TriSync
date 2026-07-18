import { addDays, formatISO } from 'date-fns';
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

/**
 * Push prescribed workouts OUT to devices the athlete can start
 * (Apple Watch via WorkoutKit, Garmin when available).
 * Does not post anything to Strava.
 */
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
      results.push({ id: 'apple', ok: true, detail: 'scheduled' });
    } catch (e) {
      results.push({
        id: 'apple',
        ok: false,
        detail: e instanceof Error ? e.message : 'Failed',
      });
    }
  }

  return results;
}

/** Schedule upcoming TriSync sessions to Apple Watch / Fitness. */
export async function pushUpcomingAppleWorkouts(
  sessions: AthleteSession[],
  opts?: { daysAhead?: number; limit?: number }
) {
  const connected = await AppleHealth.isAppleHealthConnected();
  if (!connected) return [];

  const today = formatISO(new Date(), { representation: 'date' });
  const end = formatISO(addDays(new Date(), opts?.daysAhead ?? 7), { representation: 'date' });
  const limit = opts?.limit ?? 12;

  const targets = sessions
    .filter(
      (s) =>
        !s.appleWorkoutScheduled &&
        s.discipline !== 'rest' &&
        s.scheduledDate >= today &&
        s.scheduledDate <= end
    )
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, limit);

  const results: { sessionId: string; ok: boolean; detail?: string }[] = [];
  for (const session of targets) {
    try {
      await AppleHealth.pushSessionToAppleHealth(session);
      results.push({ sessionId: session.id, ok: true, detail: 'scheduled' });
    } catch (e) {
      results.push({
        sessionId: session.id,
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

/**
 * Import activities the athlete posted on Strava and match them to TriSync sessions.
 * Returns match list for the caller to apply logs.
 */
export async function pullStravaMatches(sessions: AthleteSession[]) {
  const activities = await Strava.fetchRecentStravaActivities(21);
  return Strava.matchStravaActivitiesToSessions(sessions, activities);
}

export { Garmin, AppleHealth, Strava };
