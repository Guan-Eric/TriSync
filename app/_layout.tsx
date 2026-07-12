import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Barlow_400Regular,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/AuthContext';
import { SubscriptionProvider } from '@/lib/SubscriptionContext';
import { SessionsProvider } from '@/lib/SessionsContext';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BebasNeue_400Regular,
    Barlow_400Regular,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <SessionsProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ecebe8' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)/sign-in" />
            <Stack.Screen name="(onboarding)/index" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: true, title: 'TriSync Pro' }} />
            <Stack.Screen name="log/[id]" options={{ presentation: 'modal', headerShown: true, title: 'How did it go?' }} />
          </Stack>
        </SessionsProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
