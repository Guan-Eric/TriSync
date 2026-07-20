import 'react-native-gesture-handler';
import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { colors } from '@/lib/theme';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SubscriptionProvider>
          <SessionsProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'fade_from_bottom',
                animationDuration: 320,
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)/sign-in" options={{ animation: 'fade' }} />
              <Stack.Screen name="(onboarding)/index" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
              <Stack.Screen
                name="paywall"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  title: 'TriSync Pro',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="log/[id]"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  title: 'How did it go?',
                  animation: 'slide_from_bottom',
                }}
              />
            </Stack>
          </SessionsProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
