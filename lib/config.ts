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

export const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export function getExtra(key: keyof Extra, fallback = '') {
  const value = extra[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
