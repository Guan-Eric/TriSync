import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { AthleteSession } from '@/lib/types';
import { getExtra } from '@/lib/config';
import { sessionDetailText } from '@/lib/plans';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'trisync.strava.tokens';

type StravaTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
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
    throw new Error('Set EXPO_PUBLIC_STRAVA_CLIENT_ID and EXPO_PUBLIC_STRAVA_CLIENT_SECRET.');
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'trisync', path: 'strava' });
  const discovery = {
    authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
    tokenEndpoint: 'https://www.strava.com/oauth/token',
  };

  const request = new AuthSession.AuthRequest({
    clientId: clientId(),
    redirectUri,
    scopes: ['activity:write', 'activity:read'],
    usePKCE: false,
    extraParams: { approval_prompt: 'auto' },
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Strava authorization was cancelled.');
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

function stravaSport(discipline: AthleteSession['discipline']) {
  switch (discipline) {
    case 'swim':
      return 'Swim';
    case 'bike':
      return 'Ride';
    case 'run':
      return 'Run';
    case 'brick':
      return 'Workout';
    default:
      return 'Workout';
  }
}

/** Creates a manual Strava activity from a completed session (v1 write path). */
export async function pushSessionToStrava(session: AthleteSession) {
  const accessToken = await getAccessToken();
  const start = `${session.scheduledDate}T08:00:00Z`;
  const body = new URLSearchParams({
    name: session.title,
    type: stravaSport(session.discipline),
    sport_type: stravaSport(session.discipline),
    start_date_local: start,
    elapsed_time: String((session.durationMinutes || 30) * 60),
    description: `${sessionDetailText(session)}\n\nLogged with TriSync`,
  });

  const res = await fetch('https://www.strava.com/api/v3/activities', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Strava activity create failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { id?: number };
  return String(json.id ?? '');
}
