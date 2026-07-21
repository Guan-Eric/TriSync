import { Platform } from 'react-native';
import { getExtra } from './config';

const ENTITLEMENT_ID = 'pro';

let configured = false;
let Purchases: typeof import('react-native-purchases').default | null = null;
let LOG_LEVEL: typeof import('react-native-purchases').LOG_LEVEL | null = null;
let RevenueCatUI: typeof import('react-native-purchases-ui').default | null = null;

export function getRevenueCatApiKey() {
  const testKey = getExtra('revenuecatTestApiKey');
  const liveKey = getExtra('revenuecatApiKey');
  // Dev clients may use the Test Store. Release / App Review binaries must use
  // `appl_…` when present — never silently fall back to `test_…`.
  if (__DEV__ && testKey) return testKey;
  if (liveKey) return liveKey;
  if (getExtra('useLocalData') === 'true' && testKey) return testKey;
  if (testKey && !__DEV__) {
    console.warn(
      '[RevenueCat] REVENUECAT_API_KEY (appl_…) missing in this build; refusing Test Store fallback.'
    );
  }
  return '';
}

export function canUseRevenueCat() {
  return Platform.OS === 'ios' && Boolean(getRevenueCatApiKey());
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

async function loadRevenueCatUI() {
  if (RevenueCatUI) return true;
  try {
    const mod = await import('react-native-purchases-ui');
    RevenueCatUI = mod.default;
    return true;
  } catch {
    return false;
  }
}

export async function getPurchasesClient() {
  if (!canUseRevenueCat()) return null;
  const ok = await loadPurchases();
  return ok && Purchases ? Purchases : null;
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
  try {
    await Purchases.logOut();
  } catch (e) {
    // Anonymous users cannot log out of RevenueCat.
    console.warn('[RevenueCat] logOut skipped', e);
  }
}

export async function restorePurchases() {
  const client = await getPurchasesClient();
  if (!client) throw new Error('Purchases unavailable in this build.');
  return client.restorePurchases();
}

export async function openCustomerCenter(onRestore?: () => void) {
  const ok = await loadRevenueCatUI();
  if (!ok || !RevenueCatUI) {
    throw new Error('Customer Center requires a native development build.');
  }
  await RevenueCatUI.presentCustomerCenter({
    callbacks: {
      onRestoreCompleted: () => onRestore?.(),
    },
  });
}

export function hasProEntitlement(
  info: import('react-native-purchases').CustomerInfo | null | undefined
) {
  if (!info) return false;
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}

export { ENTITLEMENT_ID };
