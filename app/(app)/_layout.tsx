import { Tabs } from 'expo-router';
import { View } from 'react-native';
import {
  CalendarDays,
  CalendarRange,
  CircleUserRound,
  SunMedium,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';

const ACTIVE = '#e23d28';
const INACTIVE = '#5c5a55';

function TabIcon({
  Icon,
  label,
  focused,
}: {
  Icon: LucideIcon;
  label: string;
  focused: boolean;
}) {
  const color = focused ? ACTIVE : INACTIVE;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 64 }}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#d5e0e4',
          height: 84,
          paddingTop: 10,
          paddingBottom: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={SunMedium} label="Today" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'Week',
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={CalendarDays} label="Week" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={CalendarRange} label="Plan" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={CircleUserRound} label="Settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
