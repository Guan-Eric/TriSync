import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatISO } from 'date-fns';
import { computePlanSchedule, materializeSessions } from './plans';
import { selectPlan } from '../content/plans/catalog';
import { getExtra } from './config';
import type {
  AthleteSession,
  Enrollment,
  EquipmentAccess,
  ExperienceLevel,
  LogStatus,
  RaceDistance,
  UserProfile,
} from './types';

const KEYS = {
  profile: (uid: string) => `trisync:profile:${uid}`,
  sessions: (uid: string) => `trisync:sessions:${uid}`,
  enrollment: (uid: string) => `trisync:enrollment:${uid}`,
  enrollments: (uid: string) => `trisync:enrollments:${uid}`,
};

export const useLocalData =
  getExtra('useLocalData') === 'true' ||
  !getExtra('firebaseApiKey') ||
  getExtra('firebaseApiKey') === 'demo-api-key';

export function shouldUseLocal(uid?: string | null) {
  return useLocalData || uid === 'demo-athlete';
}

export async function localEnsureProfile(uid: string, partial?: Partial<UserProfile>) {
  const existing = await localGetProfile(uid);
  if (existing) return existing;
  const now = formatISO(new Date());
  const profile: UserProfile = {
    uid,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
  await AsyncStorage.setItem(KEYS.profile(uid), JSON.stringify(profile));
  return profile;
}

export async function localGetProfile(uid: string) {
  const raw = await AsyncStorage.getItem(KEYS.profile(uid));
  return raw ? (JSON.parse(raw) as UserProfile) : null;
}

export async function localPatchProfile(uid: string, patch: Partial<UserProfile>) {
  const profile = await localGetProfile(uid);
  if (!profile) return null;
  const next = { ...profile, ...patch, updatedAt: formatISO(new Date()) };
  await AsyncStorage.setItem(KEYS.profile(uid), JSON.stringify(next));
  return next;
}

async function localListEnrollments(uid: string) {
  const raw = await AsyncStorage.getItem(KEYS.enrollments(uid));
  if (raw) return JSON.parse(raw) as Enrollment[];
  const single = await AsyncStorage.getItem(KEYS.enrollment(uid));
  return single ? ([JSON.parse(single)] as Enrollment[]) : [];
}

async function localSaveEnrollments(uid: string, enrollments: Enrollment[]) {
  await AsyncStorage.setItem(KEYS.enrollments(uid), JSON.stringify(enrollments));
  const active = enrollments.find((e) => e.status === 'active') ?? enrollments[enrollments.length - 1];
  if (active) {
    await AsyncStorage.setItem(KEYS.enrollment(uid), JSON.stringify(active));
  }
}

export async function localCompleteOnboarding(
  uid: string,
  input: {
    raceDistance: RaceDistance;
    raceDate: string;
    experienceLevel: ExperienceLevel;
    weeklyHours: number;
    equipment: EquipmentAccess;
  }
) {
  const plan = selectPlan(input.raceDistance, input.experienceLevel);
  if (!plan) throw new Error('No plan found');
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
  }).map((s, index) => ({
    ...s,
    id: `${enrollmentId}_${index}`,
  }));

  const existing = await localGetProfile(uid);
  const profile: UserProfile = {
    uid,
    onboardingComplete: true,
    ...input,
    activePlanId: plan.id,
    activeEnrollmentId: enrollmentId,
    createdAt: existing?.createdAt ?? formatISO(new Date()),
    updatedAt: formatISO(new Date()),
  };

  await AsyncStorage.setItem(KEYS.profile(uid), JSON.stringify(profile));
  await localSaveEnrollments(uid, [enrollment]);
  await AsyncStorage.setItem(KEYS.sessions(uid), JSON.stringify(sessions));

  return { plan, enrollmentId };
}

export async function localUpdateRaceSettings(
  uid: string,
  input: { raceDate: string; raceDistance: RaceDistance }
) {
  const profile = await localGetProfile(uid);
  if (!profile?.experienceLevel) throw new Error('Complete onboarding first');

  const plan = selectPlan(input.raceDistance, profile.experienceLevel);
  if (!plan) throw new Error('No plan found for selection');

  const today = formatISO(new Date(), { representation: 'date' });
  const sessions = await localListSessions(uid);
  const enrollments = await localListEnrollments(uid);
  const activeId = profile.activeEnrollmentId;

  const kept = sessions.filter((s) => {
    if (s.enrollmentId !== activeId) return true;
    if (s.logStatus != null) return true;
    if (s.scheduledDate < today) return true;
    return false;
  });

  const nextEnrollments = enrollments.map((e) =>
    e.id === activeId ? { ...e, status: 'completed' as const } : e
  );

  const enrollmentId = `${plan.id}_${Date.now()}`;
  const schedule = computePlanSchedule(input.raceDate, plan.weeks);
  const enrollment: Enrollment = {
    id: enrollmentId,
    planId: plan.id,
    startDate: schedule.startDate,
    status: 'active',
    createdAt: formatISO(new Date()),
  };

  const fresh = materializeSessions({
    plan,
    enrollmentId,
    startDate: schedule.startDate,
    weeksToGenerate: schedule.weeksToGenerate,
    weekOffset: schedule.weekOffset,
  }).map((s, index) => ({
    ...s,
    id: `${enrollmentId}_${index}`,
  }));

  const nextProfile: UserProfile = {
    ...profile,
    raceDate: input.raceDate,
    raceDistance: input.raceDistance,
    activePlanId: plan.id,
    activeEnrollmentId: enrollmentId,
    catchUpDismissedWeekKey: null,
    updatedAt: formatISO(new Date()),
  };

  await AsyncStorage.setItem(KEYS.profile(uid), JSON.stringify(nextProfile));
  await localSaveEnrollments(uid, [...nextEnrollments, enrollment]);
  await AsyncStorage.setItem(KEYS.sessions(uid), JSON.stringify([...kept, ...fresh]));

  return { plan, enrollmentId };
}

export async function localListSessions(uid: string) {
  const raw = await AsyncStorage.getItem(KEYS.sessions(uid));
  return raw ? (JSON.parse(raw) as AthleteSession[]) : [];
}

export async function localGetSession(uid: string, sessionId: string) {
  const sessions = await localListSessions(uid);
  return sessions.find((s) => s.id === sessionId) ?? null;
}

export async function localLogSession(uid: string, sessionId: string, logStatus: LogStatus) {
  const sessions = await localListSessions(uid);
  const next = sessions.map((s) =>
    s.id === sessionId ? { ...s, logStatus, loggedAt: formatISO(new Date()) } : s
  );
  await AsyncStorage.setItem(KEYS.sessions(uid), JSON.stringify(next));
}

export async function localApplyCatchUp(
  uid: string,
  sessionIds: string[],
  patches: Partial<AthleteSession>[]
) {
  const sessions = await localListSessions(uid);
  const next = sessions.map((s) => {
    const idx = sessionIds.indexOf(s.id);
    if (idx === -1) return s;
    return { ...s, ...patches[idx] };
  });
  await AsyncStorage.setItem(KEYS.sessions(uid), JSON.stringify(next));
}

export async function localSetWearableFlag(
  uid: string,
  flag: 'garminConnected' | 'appleHealthConnected' | 'stravaConnected',
  connected: boolean
) {
  const profile = await localGetProfile(uid);
  if (!profile) return;
  await AsyncStorage.setItem(
    KEYS.profile(uid),
    JSON.stringify({ ...profile, [flag]: connected, updatedAt: formatISO(new Date()) })
  );
}

export async function localSetGarminConnected(uid: string, connected: boolean) {
  return localSetWearableFlag(uid, 'garminConnected', connected);
}
