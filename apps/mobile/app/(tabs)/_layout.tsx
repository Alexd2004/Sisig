import { Tabs } from 'expo-router';
import { useAppColors } from '@sisig/ui';
import { TabBarIcon } from '../../src/components/TabBarIcon';

export default function TabsLayout(): JSX.Element {
  const colors = useAppColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.foreground,
        headerTitleStyle: { color: colors.foreground },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.foregroundMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: 'Sisig Eh!',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: 'Order',
          headerTitle: 'Place an Order',
          tabBarIcon: ({ color }) => <TabBarIcon name="cart" color={color} />,
          tabBarAccessibilityLabel: 'Order tab',
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          headerTitle: 'My Points',
          tabBarIcon: ({ color }) => <TabBarIcon name="star" color={color} />,
          tabBarAccessibilityLabel: 'Rewards tab',
        }}
      />
      <Tabs.Screen
        name="code"
        options={{
          title: 'Code',
          headerTitle: 'My Code',
          tabBarIcon: ({ color }) => <TabBarIcon name="qrcode" color={color} />,
          tabBarAccessibilityLabel: 'Code tab',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          headerTitle: 'More',
          tabBarIcon: ({ color }) => <TabBarIcon name="menu" color={color} />,
          tabBarAccessibilityLabel: 'More tab',
        }}
      />
    </Tabs>
  );
}
