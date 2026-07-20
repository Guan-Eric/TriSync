import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  OAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  revokeAccessToken,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Alert, Platform } from 'react-native';
import { auth } from './firebase';
import { deleteAllUserData, ensureUserProfile, getUserProfile } from './userData';
import { loginRevenueCat, logoutRevenueCat, configureRevenueCat } from './revenuecat';
import type { UserProfile } from './types';

type AuthDestination = 'onboarding' | 'app';

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInWithApple: () => Promise<AuthDestination>;
  signInWithEmail: (email: string, password: string) => Promise<AuthDestination>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<AuthDestination>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function nonce() {
  const raw = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}

function mapAuthError(e: unknown): Error {
  const code =
    typeof e === 'object' && e && 'code' in e && typeof (e as { code: unknown }).code === 'string'
      ? (e as { code: string }).code
      : '';
  const message = e instanceof Error ? e.message : String(e);

  switch (code) {
    case 'auth/email-already-in-use':
      return new Error('An account with this email already exists. Sign in instead.');
    case 'auth/invalid-email':
      return new Error('Enter a valid email address.');
    case 'auth/weak-password':
      return new Error('Password must be at least 6 characters.');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return new Error('Incorrect email or password.');
    case 'auth/too-many-requests':
      return new Error('Too many attempts. Try again later.');
    case 'auth/network-request-failed':
      return new Error('Network error. Check your connection and try again.');
    case 'auth/operation-not-allowed':
      return new Error('Email sign-in is not enabled yet. Enable Email/Password in Firebase Auth.');
    case 'auth/requires-recent-login':
      return new Error('For security, confirm your identity again, then retry account deletion.');
    default:
      return e instanceof Error ? e : new Error(message);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const finishSession = useCallback(async (next: User): Promise<AuthDestination> => {
    await ensureUserProfile(next.uid, {
      email: next.email,
      displayName: next.displayName,
    });
    await loginRevenueCat(next.uid);
    const p = await getUserProfile(next.uid);
    setUser(next);
    setProfile(p);
    return p?.onboardingComplete ? 'app' : 'onboarding';
  }, []);

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

    const unsub = onAuthStateChanged(auth, async (next) => {
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

  const signInWithApple = async (): Promise<AuthDestination> => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error(
          'Sign in with Apple is not available. Sign into an Apple ID under Settings → Apple Account, or use a device that supports it.'
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
      const cred = await signInWithCredential(auth, credential);
      return finishSession(cred.user);
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
          `${message}\n\nFor Apple login: enable the Apple provider in Firebase Auth, and sign into an Apple ID in Settings.`
        );
      }
      throw e instanceof Error ? e : new Error(message);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<AuthDestination> => {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      throw new Error('Enter your email and password.');
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmed, password);
      return finishSession(cred.user);
    } catch (e) {
      throw mapAuthError(e);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<AuthDestination> => {
    const trimmed = email.trim();
    const name = displayName?.trim();
    if (!trimmed || !password) {
      throw new Error('Enter your email and password.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmed, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      return finishSession(cred.user);
    } catch (e) {
      throw mapAuthError(e);
    }
  };

  const signOut = async () => {
    await logoutRevenueCat().catch(() => undefined);
    await firebaseSignOut(auth).catch(() => undefined);
    setUser(null);
    setProfile(null);
  };

  const promptPassword = () =>
    new Promise<string | null>((resolve) => {
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Confirm password',
          'Enter your password to permanently delete your account.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            { text: 'Continue', onPress: (value?: string) => resolve(value ?? null) },
          ],
          'secure-text'
        );
        return;
      }
      Alert.alert(
        'Confirm password',
        'Re-open Settings after signing in again if deletion requires a recent login.',
        [{ text: 'OK', onPress: () => resolve(null) }]
      );
    });

  const reauthenticateForDeletion = async (current: User): Promise<string | null> => {
    const isApple = current.providerData.some((p) => p.providerId === 'apple.com');
    if (isApple) {
      const { raw, hashed } = await nonce();
      const apple = await AppleAuthentication.signInAsync({
        requestedScopes: [],
        nonce: hashed,
      });
      if (!apple.identityToken) throw new Error('Apple confirmation failed. Try again.');
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: apple.identityToken,
        rawNonce: raw,
      });
      await reauthenticateWithCredential(current, credential);
      return apple.authorizationCode;
    }

    const email = current.email;
    if (!email) throw new Error('Re-sign in, then try deleting your account again.');
    const password = await promptPassword();
    if (!password) throw new Error('Account deletion cancelled.');
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(current, credential);
    return null;
  };

  const deleteAccount = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('Sign in to delete your account.');

    let appleAuthCode: string | null = null;
    try {
      appleAuthCode = await reauthenticateForDeletion(current);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes('ERR_REQUEST_CANCELED') || message.includes('cancelled')) {
        throw new Error('Account deletion cancelled.');
      }
      throw mapAuthError(e);
    }

    await deleteAllUserData(current.uid);

    if (appleAuthCode) {
      await revokeAccessToken(auth, appleAuthCode).catch((e) => {
        console.warn('[auth] Apple token revoke failed', e);
      });
    }

    await deleteUser(current);
    await logoutRevenueCat().catch(() => undefined);
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
      signInWithEmail,
      signUpWithEmail,
      signOut,
      deleteAccount,
    }),
    [user, profile, loading, refreshProfile, finishSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
