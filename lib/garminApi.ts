import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function garminExchangeCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}) {
  const fn = httpsCallable<
    typeof input,
    { ok: boolean }
  >(functions, 'garminExchangeCode');
  const res = await fn(input);
  return res.data;
}

export async function garminDisconnectCloud() {
  const fn = httpsCallable<undefined, { ok: boolean }>(functions, 'garminDisconnect');
  const res = await fn();
  return res.data;
}

export async function garminPushWorkoutCloud(sessionId: string) {
  const fn = httpsCallable<{ sessionId: string }, { ok: boolean; workoutId?: string | number }>(
    functions,
    'garminPushWorkout'
  );
  const res = await fn({ sessionId });
  return res.data;
}
