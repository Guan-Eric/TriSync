import { useState } from 'react';
import {
  View,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const { user, profile, loading, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('signUp');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const run = async (fn: () => Promise<'onboarding' | 'app'>) => {
    try {
      setBusy(true);
      const next = await fn();
      router.replace(next === 'app' ? '/(app)' : '/(onboarding)');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sign-in failed';
      Alert.alert(mode === 'signUp' ? 'Could not create account' : 'Could not sign in', message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#e23d28" />
      </View>
    );
  }

  if (user) {
    if (!profile?.onboardingComplete) return <Redirect href="/(onboarding)" />;
    return <Redirect href="/(app)" />;
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
      >
        <LinearGradient
          colors={['#141414', '#1f1f1f', '#2a2a2a']}
          locations={[0, 0.55, 1]}
          style={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 28, minHeight: 220 }}
        >
          <View
            style={{
              width: 48,
              height: 4,
              backgroundColor: '#e23d28',
              marginBottom: 24,
            }}
          />
          <Text className="mb-3 text-5xl text-white" variant="display">
            TriSync
          </Text>
          <Text className="max-w-[320px] text-lg leading-7 text-white">
            Swim. Bike. Run. One plan that treats triathlon as one sport.
          </Text>
        </LinearGradient>

        <View className="bg-background px-6 pb-12 pt-7" style={{ gap: 12 }}>
          <Text className="mb-1 text-sm text-muted-foreground">
            Structure without the coach price tag.
          </Text>

          <View className="mb-1 flex-row gap-2">
            <Pressable
              onPress={() => setMode('signUp')}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                mode === 'signUp' ? 'bg-foreground' : 'bg-muted'
              }`}
            >
              <Text
                className={mode === 'signUp' ? 'text-white' : 'text-foreground'}
                style={{ fontFamily: 'Barlow_600SemiBold' }}
              >
                Create account
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('signIn')}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                mode === 'signIn' ? 'bg-foreground' : 'bg-muted'
              }`}
            >
              <Text
                className={mode === 'signIn' ? 'text-white' : 'text-foreground'}
                style={{ fontFamily: 'Barlow_600SemiBold' }}
              >
                Sign in
              </Text>
            </Pressable>
          </View>

          {mode === 'signUp' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name (optional)"
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              editable={!busy}
              className="rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
              placeholderTextColor="#8a8a8a"
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            editable={!busy}
            className="rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
            placeholderTextColor="#8a8a8a"
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'signUp' ? 'Password (min 6 characters)' : 'Password'}
            secureTextEntry
            textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
            autoComplete={mode === 'signUp' ? 'new-password' : 'password'}
            editable={!busy}
            className="rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
            placeholderTextColor="#8a8a8a"
          />

          <Button
            title={
              busy
                ? mode === 'signUp'
                  ? 'Creating account…'
                  : 'Signing in…'
                : mode === 'signUp'
                  ? 'Create account'
                  : 'Sign in'
            }
            disabled={busy}
            onPress={() =>
              run(() =>
                mode === 'signUp'
                  ? signUpWithEmail(email, password, name)
                  : signInWithEmail(email, password)
              )
            }
          />

          {Platform.OS === 'ios' ? (
            <>
              <Text className="my-1 text-center text-xs text-muted-foreground">or</Text>
              <Button
                title={busy ? 'Signing in…' : 'Continue with Apple'}
                variant="outline"
                disabled={busy}
                onPress={() => run(signInWithApple)}
                className="border-border bg-card"
                textClassName="text-foreground"
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
