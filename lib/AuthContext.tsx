import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithCredential,
  signInAnonymously,
  OAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { auth } from './firebase';
import { ensureUserProfile, getUserProfile } from './userData';
import { loginRevenueCat, logoutRevenueCat, configureRevenueCat } from './revenuecat';
import { useLocalData, localEnsureProfile, localGetProfile } from './localStore';
import type { UserProfile } from './types';

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInWithApple: () => Promise<'onboarding' | 'app'>;
  signInDemo: () => Promise<'onboarding' | 'app'>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type DemoUser = User & { isDemo?: boolean };

function makeDemoUser(): DemoUser {
  return {
    uid: 'demo-athlete',
    email: 'demo@trisync.app',
    displayName: 'Demo Athlete',
    emailVerified: true,
    isAnonymous: true,
    metadata: {} as User['metadata'],
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => undefined,
    getIdToken: async () => 'demo',
    getIdTokenResult: async () => ({} as never),
    reload: async () => undefined,
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: 'demo',
    isDemo: true,
  } as DemoUser;
}

async function nonce() {
  const raw = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const demoSessionRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) {
      setProfile(null);
      return;
    }
    const p = await getUserProfile(uid);
    setProfile(p);
  }, [user?.uid]);

  useEffect(() => {
    configureRevenueCat().catch(() => undefined);

    if (useLocalData) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (next) => {
      // Don't wipe an in-memory demo session when Firebase reports signed-out.
      if (!next && demoSessionRef.current) {
        setLoading(false);
        return;
      }

      demoSessionRef.current = false;
      setUser(next);
      if (next) {
        try {
          await ensureUserProfile(next.uid, {
            email: next.email,
            displayName: next.displayName,
          });
          await loginRevenueCat(next.uid);
          setProfile(await getUserProfile(next.uid));
        } catch (e) {
          console.warn('[auth] profile sync failed', e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const startLocalDemo = async (displayName = 'Demo Athlete'): Promise<'onboarding' | 'app'> => {
    const demo = makeDemoUser();
    demoSessionRef.current = true;
    await localEnsureProfile(demo.uid, {
      email: demo.email,
      displayName,
    });
    const p = await localGetProfile(demo.uid);
    setUser(demo);
    setProfile(p);
    return p?.onboardingComplete ? 'app' : 'onboarding';
  };

  const signInWithApple = async (): Promise<'onboarding' | 'app'> => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    if (useLocalData) {
      return startLocalDemo('Apple Athlete');
    }

    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error(
          'Sign in with Apple is not available here. On Simulator use “Continue in demo mode”, or sign into an Apple ID under Settings → Apple Account.'
        );
      }

      const { raw, hashed } = await nonce();
      const apple = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashed,
      });
      if (!apple.identityToken) throw new Error('No identity token from Apple');
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: apple.identityToken,
        rawNonce: raw,
      });
      demoSessionRef.current = false;
      const cred = await signInWithCredential(auth, credential);
      await ensureUserProfile(cred.user.uid, {
        email: cred.user.email,
        displayName: cred.user.displayName,
      });
      await loginRevenueCat(cred.user.uid);
      const p = await getUserProfile(cred.user.uid);
      setUser(cred.user);
      setProfile(p);
      return p?.onboardingComplete ? 'app' : 'onboarding';
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (
        message.includes('ERR_REQUEST_CANCELED') ||
        message.includes('ERR_REQUEST_UNKNOWN') ||
        message.includes('1000') ||
        message.includes('1001') ||
        message.includes('auth/operation-not-allowed') ||
        message.includes('not available')
      ) {
        throw new Error(
          `${message}\n\nOn Simulator, use “Continue in demo mode”. For real Apple login: enable Apple provider in Firebase Auth, and sign into an Apple ID in Simulator Settings.`
        );
      }
      throw e instanceof Error ? e : new Error(message);
    }
  };

  const signInDemo = async (): Promise<'onboarding' | 'app'> => {
    if (!useLocalData) {
      try {
        demoSessionRef.current = false;
        const cred = await signInAnonymously(auth);
        await ensureUserProfile(cred.user.uid, {
          email: cred.user.email,
          displayName: cred.user.displayName ?? 'Demo Athlete',
        });
        await loginRevenueCat(cred.user.uid);
        const p = await getUserProfile(cred.user.uid);
        setUser(cred.user);
        setProfile(p);
        return p?.onboardingComplete ? 'app' : 'onboarding';
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn('[auth] anonymous failed, using local demo', message);
        return startLocalDemo();
      }
    }

    return startLocalDemo();
  };

  const signOut = async () => {
    await logoutRevenueCat().catch(() => undefined);
    demoSessionRef.current = false;
    if (!useLocalData) {
      await firebaseSignOut(auth).catch(() => undefined);
    }
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      refreshProfile,
      signInWithApple,
      signInDemo,
      signOut,
    }),
    [user, profile, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
