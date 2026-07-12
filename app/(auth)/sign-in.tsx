import { useState } from 'react';
import { View, Alert, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

export default function SignInScreen() {
  const { user, profile, loading, signInWithApple, signInDemo } = useAuth();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<'onboarding' | 'app'>) => {
    try {
      setBusy(true);
      const next = await fn();
      router.replace(next === 'app' ? '/(app)' : '/(onboarding)');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sign-in failed';
      Alert.alert('Could not sign in', message);
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
    <View className="flex-1 bg-background">
      {/* Asphalt race band — athletic, not wellness */}
      <LinearGradient
        colors={['#141414', '#1f1f1f', '#2a2a2a']}
        locations={[0, 0.55, 1]}
        style={{ flex: 1.15, paddingHorizontal: 24, paddingTop: 88, paddingBottom: 36 }}
      >
        <View
          style={{
            width: 48,
            height: 4,
            backgroundColor: '#e23d28',
            marginBottom: 28,
          }}
        />
        <Text className="mb-4 text-6xl text-white" variant="display">
          TriSync
        </Text>
        <Text className="max-w-[320px] text-xl leading-7 text-white">
          Swim. Bike. Run. One plan that treats triathlon as one sport.
        </Text>
      </LinearGradient>

      <View className="bg-background px-6 pb-12 pt-8" style={{ gap: 12 }}>
        <Text className="mb-2 text-sm text-muted-foreground">
          Structure without the coach price tag.
        </Text>

        {Platform.OS === 'ios' ? (
          <Button
            title={busy ? 'Signing in…' : 'Continue with Apple'}
            disabled={busy}
            onPress={() => run(signInWithApple)}
            className="bg-foreground"
            textClassName="text-white"
          />
        ) : null}

        <Button
          title="Continue in demo mode"
          variant="outline"
          disabled={busy}
          onPress={() => run(signInDemo)}
          className="border-border bg-card"
          textClassName="text-foreground"
        />

        <Text className="mt-2 text-center text-xs text-muted-foreground">
          On Simulator, use demo mode. Apple Sign-In needs an Apple ID in Settings.
        </Text>
      </View>
    </View>
  );
}
