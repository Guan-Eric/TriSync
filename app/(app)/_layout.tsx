import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: focused ? '#e23d28' : '#5c5a55' }}>
      {label}
    </Text>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#d5e0e4',
          height: 84,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarLabel: ({ focused }) => <TabLabel label="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'Week',
          tabBarLabel: ({ focused }) => <TabLabel label="Week" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarLabel: ({ focused }) => <TabLabel label="Plan" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: ({ focused }) => <TabLabel label="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
