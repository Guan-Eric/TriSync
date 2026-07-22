import Constants from 'expo-constants';

type Extra = {
  useLocalData?: string;
  firebaseApiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  revenuecatApiKey?: string;
  revenuecatTestApiKey?: string;
  garminClientId?: string;
  garminClientSecret?: string;
  stravaClientId?: string;
  stravaClientSecret?: string;
};

function readExtra(): Extra {
  const expoConfig = Constants.expoConfig?.extra;
  if (expoConfig && typeof expoConfig === 'object') return expoConfig as Extra;

  // Fallbacks for embedded / Updates manifests
  const manifest2 = Constants.manifest2 as
    | { extra?: { expoClient?: { extra?: Extra } } }
    | null
    | undefined;
  const fromUpdates = manifest2?.extra?.expoClient?.extra;
  if (fromUpdates && typeof fromUpdates === 'object') return fromUpdates;

  const manifest = Constants.manifest as { extra?: Extra } | null | undefined;
  if (manifest?.extra && typeof manifest.extra === 'object') return manifest.extra;

  return {};
}

export const extra = readExtra();

export function getExtra(key: keyof Extra, fallback = '') {
  const value = extra[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
