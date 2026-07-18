import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { subDays } from 'date-fns';
import type { AthleteSession, Discipline, LogStatus } from '@/lib/types';
import { getExtra } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'trisync.strava.tokens';

type StravaTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time?: number;
};

function clientId() {
  return getExtra('stravaClientId');
}

function clientSecret() {
  return getExtra('stravaClientSecret');
}

export function isStravaConfigured() {
  return Boolean(clientId() && clientSecret());
}

export async function getStravaTokens(): Promise<StravaTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as StravaTokens) : null;
}

export async function isStravaConnected() {
  return Boolean(await getStravaTokens());
}

async function saveTokens(tokens: StravaTokens) {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function disconnectStrava() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function exchange(body: URLSearchParams) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Strava token error (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  const tokens: StravaTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_at * 1000,
  };
  await saveTokens(tokens);
  return tokens;
}

export async function connectStrava() {
  if (!isStravaConfigured()) {
    throw new Error('Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in .env.');
  }

  // Strava's "Authorization Callback Domain" is a bare domain only (no scheme/path).
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'trisync',
    native: 'trisync://localhost',
  });
  const discovery = {
    authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
    tokenEndpoint: 'https://www.strava.com/oauth/token',
  };

  const request = new AuthSession.AuthRequest({
    clientId: clientId(),
    redirectUri,
    // Read-only: athlete posts on Strava; TriSync imports activities.
    scopes: ['activity:read_all'],
    usePKCE: false,
    extraParams: { approval_prompt: 'auto' },
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Strava authorization was cancelled.');
  }

  const granted = String(result.params.scope ?? '');
  if (!granted.includes('activity:read') && !granted.includes('read')) {
    throw new Error('Strava did not grant activity read access. Reconnect and allow activity access.');
  }

  await exchange(
    new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      code: result.params.code,
      grant_type: 'authorization_code',
    })
  );
  return true;
}

async function getAccessToken() {
  const tokens = await getStravaTokens();
  if (!tokens) throw new Error('Strava is not connected.');
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;

  try {
    const next = await exchange(
      new URLSearchParams({
        client_id: clientId(),
        client_secret: clientSecret(),
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      })
    );
    return next.accessToken;
  } catch {
    await disconnectStrava();
    throw new Error('Strava session expired. Reconnect in Settings.');
  }
}

function mapStravaType(type: string, sportType?: string): Discipline | null {
  const key = (sportType || type || '').toLowerCase();
  if (key.includes('swim')) return 'swim';
  if (key.includes('ride') || key.includes('cycle') || key.includes('bike')) return 'bike';
  if (key.includes('run') || key.includes('walk') || key.includes('hike')) return 'run';
  if (key.includes('workout') || key.includes('multisport') || key.includes('triathlon')) {
    return 'brick';
  }
  return null;
}

function activityDateKey(startDateLocal: string) {
  // Strava local start is ISO-like; take calendar date.
  return startDateLocal.slice(0, 10);
}

/** Fetches recent activities the athlete posted on Strava (no writes). */
export async function fetchRecentStravaActivities(daysBack = 14): Promise<StravaActivity[]> {
  const accessToken = await getAccessToken();
  const after = Math.floor(subDays(new Date(), daysBack).getTime() / 1000);
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 401 || res.status === 403) {
    await disconnectStrava();
    throw new Error('Strava session expired. Reconnect in Settings.');
  }
  if (!res.ok) {
    throw new Error(`Strava activity sync failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as StravaActivity[];
}

export type StravaMatch = {
  sessionId: string;
  activityId: string;
  logStatus: Exclude<LogStatus, null>;
};

/**
 * Match Strava activities to unlogged TriSync sessions by date + discipline.
 * Caller applies the logs — TriSync never posts activities to Strava.
 */
export function matchStravaActivitiesToSessions(
  sessions: AthleteSession[],
  activities: StravaActivity[]
): StravaMatch[] {
  const usedActivities = new Set<number>();
  const matches: StravaMatch[] = [];

  const candidates = sessions
    .filter((s) => s.discipline !== 'rest' && s.logStatus == null && !s.stravaActivityId)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  for (const session of candidates) {
    const match = activities.find((activity) => {
      if (usedActivities.has(activity.id)) return false;
      const discipline = mapStravaType(activity.type, activity.sport_type);
      if (!discipline || discipline !== session.discipline) return false;
      return activityDateKey(activity.start_date_local) === session.scheduledDate;
    });
    if (!match) continue;
    usedActivities.add(match.id);
    matches.push({
      sessionId: session.id,
      activityId: String(match.id),
      logStatus: 'on_target',
    });
  }

  return matches;
}

/** @deprecated TriSync no longer posts to Strava — use fetch + match instead. */
export async function pushSessionToStrava(_session: AthleteSession): Promise<string> {
  throw new Error(
    'TriSync does not post to Strava. Connect Strava and use Sync to import activities you logged there.'
  );
}
