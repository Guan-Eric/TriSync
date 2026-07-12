import type { AthleteSession } from '@/lib/types';
import * as Garmin from './garmin';
import * as AppleHealth from './healthkit';
import * as Strava from './strava';

export type WearableId = 'garmin' | 'apple' | 'strava';

export type WearableStatus = {
  garmin: boolean;
  apple: boolean;
  strava: boolean;
};

export async function getWearableStatus(): Promise<WearableStatus> {
  const [garmin, apple, strava] = await Promise.all([
    Garmin.isGarminConnected(),
    AppleHealth.isAppleHealthConnected(),
    Strava.isStravaConnected(),
  ]);
  return { garmin, apple, strava };
}

export async function syncSessionToWearables(session: AthleteSession) {
  const status = await getWearableStatus();
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

export { Garmin, AppleHealth, Strava };
