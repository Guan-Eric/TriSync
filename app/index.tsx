import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/AuthContext';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#e23d28" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/sign-in" />;
  if (!profile?.onboardingComplete) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(app)" />;
}
