import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { useSessions } from '@/lib/SessionsContext';
import { useSubscription } from '@/lib/SubscriptionContext';

/** Reload profile, sessions, and subscription whenever the screen is focused. */
export function useRefreshOnFocus() {
  const { refreshProfile } = useAuth();
  const { refresh: refreshSessions } = useSessions();
  const { refresh: refreshSubscription } = useSubscription();

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        refreshProfile(),
        refreshSessions({ silent: true }),
        refreshSubscription(),
      ]);
    }, [refreshProfile, refreshSessions, refreshSubscription])
  );
}
