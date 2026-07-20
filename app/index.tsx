import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { colors } from '@/lib/theme';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/sign-in" />;
  if (!profile?.onboardingComplete) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(app)" />;
}
