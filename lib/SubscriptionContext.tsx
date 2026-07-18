import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { hasProEntitlement, getPurchasesClient, canUseRevenueCat } from './revenuecat';
import { useAuth } from './AuthContext';

type SubscriptionContextValue = {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      if (!canUseRevenueCat()) {
        setCustomerInfo(null);
        return;
      }
      const Purchases = await getPurchasesClient();
      if (!Purchases) {
        setCustomerInfo(null);
        return;
      }
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch {
      setCustomerInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setCustomerInfo(null);
      setLoading(false);
      return;
    }
    let remove: (() => void) | undefined;
    refresh().then(async () => {
      if (!canUseRevenueCat()) return;
      try {
        const Purchases = await getPurchasesClient();
        if (!Purchases) return;
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
      isPro: hasProEntitlement(customerInfo),
      loading,
      refresh,
    }),
    [customerInfo, loading, refresh]
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
