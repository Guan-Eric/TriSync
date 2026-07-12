import { Platform } from 'react-native';
import { getExtra } from './config';

const ENTITLEMENT_ID = 'pro';

let configured = false;
let Purchases: typeof import('react-native-purchases').default | null = null;
let LOG_LEVEL: typeof import('react-native-purchases').LOG_LEVEL | null = null;

export function getRevenueCatApiKey() {
  const preferTest = getExtra('useLocalData') === 'true' || __DEV__;
  const testKey = getExtra('revenuecatTestApiKey');
  const liveKey = getExtra('revenuecatApiKey');
  if (preferTest && testKey) return testKey;
  return liveKey || testKey || '';
}

async function loadPurchases() {
  if (Purchases) return true;
  try {
    const mod = await import('react-native-purchases');
    Purchases = mod.default;
    LOG_LEVEL = mod.LOG_LEVEL;
    return true;
  } catch {
    return false;
  }
}

export async function configureRevenueCat(appUserId?: string) {
  if (Platform.OS !== 'ios' || configured) return;
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn('[RevenueCat] Missing API key — purchases disabled until configured.');
    return;
  }
  const ok = await loadPurchases();
  if (!ok || !Purchases) {
    console.warn('[RevenueCat] Native module unavailable (use a dev build for IAP).');
    return;
  }
  Purchases.setLogLevel(__DEV__ && LOG_LEVEL ? LOG_LEVEL.DEBUG : (LOG_LEVEL?.INFO as never));
  Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
}

export async function loginRevenueCat(uid: string) {
  if (!configured && getRevenueCatApiKey()) {
    await configureRevenueCat(uid);
    return;
  }
  if (!configured || !Purchases) return;
  await Purchases.logIn(uid);
}

export async function logoutRevenueCat() {
  if (!configured || !Purchases) return;
  await Purchases.logOut();
}

export function hasProEntitlement(
  info: import('react-native-purchases').CustomerInfo | null | undefined
) {
  if (!info) return false;
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}

export { ENTITLEMENT_ID };
