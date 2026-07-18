import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  applyCatchUp,
  getUserProfile,
  listSessions,
  logSession,
  markAppleWorkoutScheduled,
  patchUserProfile,
  rescheduleSession,
  updateRaceSettings,
} from './userData';
import {
  catchUpWeekKey,
  countMissedThisWeek,
  nextSessionsToSimplify,
  simplifyPrescription,
} from './plans';
import { pullStravaMatches, pushUpcomingGarminWorkouts } from './wearables';
import type {
  AthleteSession,
  EquipmentAccess,
  ExperienceLevel,
  LogStatus,
  RaceDistance,
} from './types';

type RaceSettingsInput = {
  raceDate: string;
  raceDistance: RaceDistance;
  experienceLevel: ExperienceLevel;
  equipment: EquipmentAccess;
  weeklyHours: number;
};

type SessionsContextValue = {
  sessions: AthleteSession[];
  loading: boolean;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  log: (sessionId: string, status: LogStatus) => Promise<void>;
  reschedule: (sessionId: string, scheduledDate: string) => Promise<void>;
  missedThisWeek: number;
  needsCatchUp: boolean;
  applyCatchUpPlan: () => Promise<void>;
  dismissCatchUp: () => Promise<void>;
  updateRace: (input: RaceSettingsInput) => Promise<void>;
  /** Import activities from Strava into matching TriSync sessions. */
  syncFromStrava: () => Promise<number>;
  markAppleScheduled: (sessionId: string) => Promise<void>;
};

const SessionsContext = createContext<SessionsContextValue | undefined>(undefined);

export function SessionsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [sessions, setSessions] = useState<AthleteSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const [data, latestProfile] = await Promise.all([
        listSessions(user.uid),
        getUserProfile(user.uid),
      ]);
      const activeId = latestProfile?.activeEnrollmentId;
      setSessions(activeId ? data.filter((s) => s.enrollmentId === activeId) : data);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const log = useCallback(
    async (sessionId: string, status: LogStatus) => {
      if (!user) return;
      await logSession(user.uid, sessionId, status);
      await refresh();
    },
    [user, refresh]
  );

  const reschedule = useCallback(
    async (sessionId: string, scheduledDate: string) => {
      if (!user) return;
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, scheduledDate } : s))
      );
      try {
        await rescheduleSession(user.uid, sessionId, scheduledDate);
        await refresh();
      } catch (e) {
        await refresh();
        throw e;
      }
    },
    [user, refresh]
  );

  const weekKey = catchUpWeekKey();
  const missedThisWeek = countMissedThisWeek(sessions);
  const needsCatchUp =
    missedThisWeek >= 2 && profile?.catchUpDismissedWeekKey !== weekKey;

  const dismissCatchUp = useCallback(async () => {
    if (!user) return;
    await patchUserProfile(user.uid, { catchUpDismissedWeekKey: weekKey });
    await refreshProfile();
  }, [user, weekKey, refreshProfile]);

  const applyCatchUpPlan = useCallback(async () => {
    if (!user) return;
    const targets = nextSessionsToSimplify(sessions, 3);
    if (targets.length) {
      const patches = targets.map((s) => simplifyPrescription(s));
      await applyCatchUp(
        user.uid,
        targets.map((t) => t.id),
        patches
      );
    }
    await patchUserProfile(user.uid, { catchUpDismissedWeekKey: weekKey });
    await refreshProfile();
    await refresh();
  }, [user, sessions, weekKey, refreshProfile, refresh]);

  const updateRace = useCallback(
    async (input: RaceSettingsInput) => {
      if (!user) return;
      await updateRaceSettings(user.uid, input);
      await refreshProfile();
      await refresh();
      const latestProfile = await getUserProfile(user.uid);
      if (latestProfile?.garminConnected) {
        const allSessions = await listSessions(user.uid);
        await pushUpcomingGarminWorkouts(allSessions, latestProfile);
        await refresh({ silent: true });
      }
    },
    [user, refreshProfile, refresh]
  );

  const syncFromStrava = useCallback(async () => {
    if (!user) return 0;
    const matches = await pullStravaMatches(sessions);
    for (const match of matches) {
      await logSession(user.uid, match.sessionId, match.logStatus, {
        stravaActivityId: match.activityId,
      });
    }
    if (matches.length) await refresh();
    return matches.length;
  }, [user, sessions, refresh]);

  const markAppleScheduled = useCallback(
    async (sessionId: string) => {
      if (!user) return;
      await markAppleWorkoutScheduled(user.uid, sessionId);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, appleWorkoutScheduled: true } : s))
      );
    },
    [user]
  );

  const value = useMemo(
    () => ({
      sessions,
      loading,
      refresh,
      log,
      reschedule,
      missedThisWeek,
      needsCatchUp,
      applyCatchUpPlan,
      dismissCatchUp,
      updateRace,
      syncFromStrava,
      markAppleScheduled,
    }),
    [
      sessions,
      loading,
      refresh,
      log,
      reschedule,
      missedThisWeek,
      needsCatchUp,
      applyCatchUpPlan,
      dismissCatchUp,
      updateRace,
      syncFromStrava,
      markAppleScheduled,
    ]
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions must be used within SessionsProvider');
  return ctx;
}
