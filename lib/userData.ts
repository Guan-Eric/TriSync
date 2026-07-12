import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import { formatISO } from 'date-fns';
import { db } from './firebase';
import { computePlanSchedule, materializeSessions } from './plans';
import { selectPlan } from '../content/plans/catalog';
import {
  localApplyCatchUp,
  localCompleteOnboarding,
  localEnsureProfile,
  localGetProfile,
  localGetSession,
  localListSessions,
  localLogSession,
  localPatchProfile,
  localSetWearableFlag,
  localUpdateRaceSettings,
  shouldUseLocal,
} from './localStore';
import type {
  AthleteSession,
  Enrollment,
  EquipmentAccess,
  ExperienceLevel,
  LogStatus,
  RaceDistance,
  UserProfile,
} from './types';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (shouldUseLocal(uid)) return localGetProfile(uid);
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function ensureUserProfile(uid: string, partial?: Partial<UserProfile>) {
  if (shouldUseLocal(uid)) return localEnsureProfile(uid, partial);
  const ref = doc(db, 'users', uid);
  const existing = await getDoc(ref);
  const now = formatISO(new Date());
  if (!existing.exists()) {
    const profile: UserProfile = {
      uid,
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    await setDoc(ref, profile);
    return profile;
  }
  return existing.data() as UserProfile;
}

export async function patchUserProfile(uid: string, patch: Partial<UserProfile>) {
  if (shouldUseLocal(uid)) return localPatchProfile(uid, patch);
  await setDoc(
    doc(db, 'users', uid),
    { ...patch, updatedAt: formatISO(new Date()) },
    { merge: true }
  );
  return getUserProfile(uid);
}

export async function completeOnboarding(
  uid: string,
  input: {
    raceDistance: RaceDistance;
    raceDate: string;
    experienceLevel: ExperienceLevel;
    weeklyHours: number;
    equipment: EquipmentAccess;
  }
) {
  if (shouldUseLocal(uid)) return localCompleteOnboarding(uid, input);

  const plan = selectPlan(input.raceDistance, input.experienceLevel);
  if (!plan) throw new Error('No plan found for selection');

  const enrollmentId = `${plan.id}_${Date.now()}`;
  const schedule = computePlanSchedule(input.raceDate, plan.weeks);
  const enrollment: Enrollment = {
    id: enrollmentId,
    planId: plan.id,
    startDate: schedule.startDate,
    status: 'active',
    createdAt: formatISO(new Date()),
  };

  const sessions = materializeSessions({
    plan,
    enrollmentId,
    startDate: schedule.startDate,
    weeksToGenerate: schedule.weeksToGenerate,
    weekOffset: schedule.weekOffset,
  });

  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid, 'enrollments', enrollmentId), enrollment);

  sessions.forEach((session, index) => {
    const id = `${enrollmentId}_${index}`;
    batch.set(doc(db, 'users', uid, 'sessions', id), { ...session, id });
  });

  batch.set(
    doc(db, 'users', uid),
    {
      ...input,
      onboardingComplete: true,
      activePlanId: plan.id,
      activeEnrollmentId: enrollmentId,
      updatedAt: formatISO(new Date()),
    },
    { merge: true }
  );

  await batch.commit();
  return { plan, enrollmentId };
}

export async function updateRaceSettings(
  uid: string,
  input: { raceDate: string; raceDistance: RaceDistance }
) {
  if (shouldUseLocal(uid)) return localUpdateRaceSettings(uid, input);

  const profile = await getUserProfile(uid);
  if (!profile?.experienceLevel) throw new Error('Complete onboarding first');

  const plan = selectPlan(input.raceDistance, profile.experienceLevel);
  if (!plan) throw new Error('No plan found for selection');

  const today = formatISO(new Date(), { representation: 'date' });
  const activeId = profile.activeEnrollmentId;

  if (activeId) {
    await updateDoc(doc(db, 'users', uid, 'enrollments', activeId), {
      status: 'completed',
    });

    const existingSnap = await getDocs(
      query(collection(db, 'users', uid, 'sessions'), orderBy('scheduledDate', 'asc'))
    );

    let deleteBatch = writeBatch(db);
    let deleteOps = 0;
    for (const sessionDoc of existingSnap.docs) {
      const data = sessionDoc.data() as AthleteSession;
      if (data.enrollmentId !== activeId) continue;
      if (data.logStatus != null) continue;
      if (data.scheduledDate < today) continue;
      deleteBatch.delete(sessionDoc.ref);
      deleteOps += 1;
      if (deleteOps >= 400) {
        await deleteBatch.commit();
        deleteBatch = writeBatch(db);
        deleteOps = 0;
      }
    }
    if (deleteOps > 0) await deleteBatch.commit();
  }

  const enrollmentId = `${plan.id}_${Date.now()}`;
  const schedule = computePlanSchedule(input.raceDate, plan.weeks);
  const enrollment: Enrollment = {
    id: enrollmentId,
    planId: plan.id,
    startDate: schedule.startDate,
    status: 'active',
    createdAt: formatISO(new Date()),
  };

  const sessions = materializeSessions({
    plan,
    enrollmentId,
    startDate: schedule.startDate,
    weeksToGenerate: schedule.weeksToGenerate,
    weekOffset: schedule.weekOffset,
  });

  let batch = writeBatch(db);
  let ops = 0;
  batch.set(doc(db, 'users', uid, 'enrollments', enrollmentId), enrollment);
  ops += 1;

  for (let index = 0; index < sessions.length; index++) {
    const id = `${enrollmentId}_${index}`;
    batch.set(doc(db, 'users', uid, 'sessions', id), { ...sessions[index], id });
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }

  batch.set(
    doc(db, 'users', uid),
    {
      raceDate: input.raceDate,
      raceDistance: input.raceDistance,
      activePlanId: plan.id,
      activeEnrollmentId: enrollmentId,
      catchUpDismissedWeekKey: null,
      updatedAt: formatISO(new Date()),
    },
    { merge: true }
  );
  await batch.commit();

  return { plan, enrollmentId };
}

export async function listSessions(uid: string): Promise<AthleteSession[]> {
  if (shouldUseLocal(uid)) return localListSessions(uid);
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'sessions'), orderBy('scheduledDate', 'asc'))
  );
  return snap.docs.map((d) => d.data() as AthleteSession);
}

export async function getSession(uid: string, sessionId: string) {
  if (shouldUseLocal(uid)) return localGetSession(uid, sessionId);
  const snap = await getDoc(doc(db, 'users', uid, 'sessions', sessionId));
  return snap.exists() ? (snap.data() as AthleteSession) : null;
}

export async function logSession(uid: string, sessionId: string, logStatus: LogStatus) {
  if (shouldUseLocal(uid)) return localLogSession(uid, sessionId, logStatus);
  await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), {
    logStatus,
    loggedAt: formatISO(new Date()),
  });
}

export async function applyCatchUp(
  uid: string,
  sessionIds: string[],
  patches: Partial<AthleteSession>[]
) {
  if (shouldUseLocal(uid)) return localApplyCatchUp(uid, sessionIds, patches);
  const batch = writeBatch(db);
  sessionIds.forEach((id, i) => {
    batch.update(doc(db, 'users', uid, 'sessions', id), patches[i] ?? {});
  });
  await batch.commit();
}

export async function setWearableConnected(
  uid: string,
  flag: 'garminConnected' | 'appleHealthConnected' | 'stravaConnected',
  connected: boolean
) {
  if (shouldUseLocal(uid)) return localSetWearableFlag(uid, flag, connected);
  await setDoc(
    doc(db, 'users', uid),
    { [flag]: connected, updatedAt: formatISO(new Date()) },
    { merge: true }
  );
}

export async function setGarminConnected(uid: string, connected: boolean) {
  return setWearableConnected(uid, 'garminConnected', connected);
}
