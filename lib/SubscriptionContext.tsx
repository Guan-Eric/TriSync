import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomerInfo } from 'react-native-purchases';
import { hasProEntitlement, getRevenueCatApiKey } from './revenuecat';
import { useAuth } from './AuthContext';

const DEMO_PRO_KEY = 'trisync:demo_pro';

type SubscriptionContextValue = {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  unlockDemoPro: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [demoPro, setDemoPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const demo = (await AsyncStorage.getItem(DEMO_PRO_KEY)) === '1';
      setDemoPro(demo);
      if (!getRevenueCatApiKey()) {
        setCustomerInfo(null);
        return;
      }
      const Purchases = (await import('react-native-purchases')).default;
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch {
      setCustomerInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const unlockDemoPro = useCallback(async () => {
    await AsyncStorage.setItem(DEMO_PRO_KEY, '1');
    setDemoPro(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setCustomerInfo(null);
      setLoading(false);
      return;
    }
    let remove: (() => void) | undefined;
    refresh().then(async () => {
      if (!getRevenueCatApiKey()) return;
      try {
        const Purchases = (await import('react-native-purchases')).default;
        const listener = (info: CustomerInfo) => setCustomerInfo(info);
        Purchases.addCustomerInfoUpdateListener(listener);
        remove = () => Purchases.removeCustomerInfoUpdateListener(listener);
      } catch {
        // Expo Go / missing native module
      }
    });
    return () => remove?.();
  }, [user?.uid, refresh]);

  const value = useMemo(
    () => ({
      customerInfo,
      isPro: demoPro || hasProEntitlement(customerInfo),
      loading,
      refresh,
      unlockDemoPro,
    }),
    [customerInfo, demoPro, loading, refresh, unlockDemoPro]
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
