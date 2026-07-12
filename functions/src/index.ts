import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

initializeApp();
const db = getFirestore();

const garminClientId = defineSecret('GARMIN_CLIENT_ID');
const garminClientSecret = defineSecret('GARMIN_CLIENT_SECRET');

type GarminTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

async function refreshGarminToken(uid: string, secrets: { id: string; secret: string }) {
  const ref = db.doc(`users/${uid}/integrations/garmin`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('failed-precondition', 'Garmin not connected');
  const data = snap.data() as GarminTokens;
  if (Date.now() < data.expiresAt - 60_000) return data.accessToken;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: data.refreshToken,
    client_id: secrets.id,
    client_secret: secrets.secret,
  });

  const res = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    await ref.delete();
    await db.doc(`users/${uid}`).set({ garminConnected: false }, { merge: true });
    throw new HttpsError('unauthenticated', 'Garmin token refresh failed');
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const next: GarminTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? data.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  await ref.set(next, { merge: true });
  return next.accessToken;
}

export const garminExchangeCode = onCall(
  { secrets: [garminClientId, garminClientSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
    const { code, codeVerifier, redirectUri } = request.data as {
      code?: string;
      codeVerifier?: string;
      redirectUri?: string;
    };
    if (!code || !codeVerifier || !redirectUri) {
      throw new HttpsError('invalid-argument', 'Missing OAuth fields');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      client_id: garminClientId.value(),
      client_secret: garminClientSecret.value(),
    });

    const res = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new HttpsError('internal', `Garmin token exchange failed: ${text}`);
    }

    const json = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    await db.doc(`users/${request.auth.uid}/integrations/garmin`).set({
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Date.now() + json.expires_in * 1000,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await db.doc(`users/${request.auth.uid}`).set({ garminConnected: true }, { merge: true });
    return { ok: true };
  }
);

export const garminDisconnect = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  await db.doc(`users/${request.auth.uid}/integrations/garmin`).delete();
  await db.doc(`users/${request.auth.uid}`).set({ garminConnected: false }, { merge: true });
  return { ok: true };
});

export const garminPushWorkout = onCall(
  { secrets: [garminClientId, garminClientSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
    const { sessionId } = request.data as { sessionId?: string };
    if (!sessionId) throw new HttpsError('invalid-argument', 'sessionId required');

    const sessionRef = db.doc(`users/${request.auth.uid}/sessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) throw new HttpsError('not-found', 'Session not found');
    const session = sessionSnap.data()!;

    const accessToken = await refreshGarminToken(request.auth.uid, {
      id: garminClientId.value(),
      secret: garminClientSecret.value(),
    });

    // Garmin Training API workout create — payload shaped for a simple single-sport or brick note.
    const blocks = Array.isArray(session.blocks) ? session.blocks : [];
    const blockText = blocks
      .map((b: { label?: string; detail?: string }) => `${b.label ?? ''}: ${b.detail ?? ''}`)
      .filter(Boolean)
      .join('\n\n');
    const description = [
      session.intensityLabel,
      blockText || session.prescription,
      session.whyItMatters ? `Why: ${session.whyItMatters}` : null,
      session.coachCues ? `Cues: ${session.coachCues}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const workout = {
      workoutName: session.title,
      description,
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
      const text = await res.text();
      throw new HttpsError('internal', `Garmin workout push failed: ${text}`);
    }

    const created = (await res.json()) as { workoutId?: string | number };
    await sessionRef.set(
      { garminWorkoutId: String(created.workoutId ?? ''), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { ok: true, workoutId: created.workoutId };
  }
);

function mapDiscipline(discipline: string) {
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
