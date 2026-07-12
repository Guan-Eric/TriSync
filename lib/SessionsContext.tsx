import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  applyCatchUp,
  getUserProfile,
  listSessions,
  logSession,
  patchUserProfile,
  updateRaceSettings,
} from './userData';
import {
  catchUpWeekKey,
  countMissedThisWeek,
  nextSessionsToSimplify,
  simplifyPrescription,
} from './plans';
import type { AthleteSession, LogStatus, RaceDistance } from './types';

type SessionsContextValue = {
  sessions: AthleteSession[];
  loading: boolean;
  refresh: () => Promise<void>;
  log: (sessionId: string, status: LogStatus) => Promise<void>;
  missedThisWeek: number;
  needsCatchUp: boolean;
  applyCatchUpPlan: () => Promise<void>;
  dismissCatchUp: () => Promise<void>;
  updateRace: (input: { raceDate: string; raceDistance: RaceDistance }) => Promise<void>;
};

const SessionsContext = createContext<SessionsContextValue | undefined>(undefined);

export function SessionsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [sessions, setSessions] = useState<AthleteSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, latestProfile] = await Promise.all([
        listSessions(user.uid),
        getUserProfile(user.uid),
      ]);
      const activeId = latestProfile?.activeEnrollmentId;
      setSessions(activeId ? data.filter((s) => s.enrollmentId === activeId) : data);
    } finally {
      setLoading(false);
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
    async (input: { raceDate: string; raceDistance: RaceDistance }) => {
      if (!user) return;
      await updateRaceSettings(user.uid, input);
      await refreshProfile();
      await refresh();
    },
    [user, refreshProfile, refresh]
  );

  const value = useMemo(
    () => ({
      sessions,
      loading,
      refresh,
      log,
      missedThisWeek,
      needsCatchUp,
      applyCatchUpPlan,
      dismissCatchUp,
      updateRace,
    }),
    [
      sessions,
      loading,
      refresh,
      log,
      missedThisWeek,
      needsCatchUp,
      applyCatchUpPlan,
      dismissCatchUp,
      updateRace,
    ]
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions must be used within SessionsProvider');
  return ctx;
}
