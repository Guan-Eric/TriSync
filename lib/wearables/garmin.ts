import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { AthleteSession, Discipline } from '@/lib/types';
import { getExtra } from '@/lib/config';
import { sessionDetailText } from '@/lib/plans';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'trisync.garmin.tokens';

type GarminTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

function clientId() {
  return getExtra('garminClientId');
}

function clientSecret() {
  return getExtra('garminClientSecret');
}

export function isGarminConfigured() {
  return Boolean(clientId());
}

export async function getGarminTokens(): Promise<GarminTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as GarminTokens) : null;
}

export async function isGarminConnected() {
  return Boolean(await getGarminTokens());
}

async function saveTokens(tokens: GarminTokens) {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function disconnectGarmin() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function exchangeToken(body: URLSearchParams) {
  const res = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Garmin token error (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const tokens: GarminTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  await saveTokens(tokens);
  return tokens;
}

export async function connectGarmin() {
  const id = clientId();
  if (!id) {
    throw new Error('Set EXPO_PUBLIC_GARMIN_CLIENT_ID from your Garmin Connect developer app.');
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'trisync', path: 'garmin' });
  const discovery = {
    authorizationEndpoint: 'https://connect.garmin.com/oauth2Confirm',
    tokenEndpoint: 'https://diauth.garmin.com/di-oauth2-service/oauth/token',
  };

  const request = new AuthSession.AuthRequest({
    clientId: id,
    redirectUri,
    scopes: ['ACTIVITY_WRITE', 'WORKOUT_IMPORT'],
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Garmin authorization was cancelled.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: result.params.code,
    code_verifier: request.codeVerifier ?? '',
    redirect_uri: redirectUri,
    client_id: id,
  });
  const secret = clientSecret();
  if (secret) body.set('client_secret', secret);

  await exchangeToken(body);
  return true;
}

async function getAccessToken() {
  const tokens = await getGarminTokens();
  if (!tokens) throw new Error('Garmin is not connected.');
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: clientId(),
  });
  const secret = clientSecret();
  if (secret) body.set('client_secret', secret);

  try {
    const next = await exchangeToken(body);
    return next.accessToken;
  } catch {
    await disconnectGarmin();
    throw new Error('Garmin session expired. Reconnect in Settings.');
  }
}

function mapDiscipline(discipline: Discipline) {
  switch (discipline) {
    case 'swim':
      return 'LAP_SWIMMING';
    case 'bike':
      return 'CYCLING';
    case 'run':
      return 'RUNNING';
    case 'brick':
      return 'MULTI_SPORT';
    default:
      return 'OTHER';
  }
}

export async function pushSessionToGarmin(session: AthleteSession) {
  const accessToken = await getAccessToken();
  const workout = {
    workoutName: session.title,
    description: sessionDetailText(session),
    sport: mapDiscipline(session.discipline),
    estimatedDurationInSecs: (session.durationMinutes ?? 30) * 60,
  };

  const res = await fetch('https://apis.garmin.com/workoutportal/workout/v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workout),
  });

  if (!res.ok) {
    throw new Error(`Garmin workout push failed (${res.status}): ${await res.text()}`);
  }

  const created = (await res.json()) as { workoutId?: string | number };
  return String(created.workoutId ?? '');
}
