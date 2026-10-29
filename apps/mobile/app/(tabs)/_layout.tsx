import { Tabs } from 'expo-router';
import { TabBarIcon } from '../../src/components/TabBarIcon';
import { popTabStackToRoot } from '../../src/navigation/pop-to-root';

export default function TabsLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        // Each tab renders its own Stack, which draws the header.
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
      screenListeners={({ navigation, route }) => ({
        tabPress: () => popTabStackToRoot(navigation, route.key),
      })}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: 'Order',
          tabBarIcon: ({ color }) => <TabBarIcon name="cart" color={color} />,
          tabBarAccessibilityLabel: 'Order tab',
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color }) => <TabBarIcon name="star" color={color} />,
          tabBarAccessibilityLabel: 'Rewards tab',
        }}
      />
      <Tabs.Screen
        name="code"
        options={{
          title: 'Code',
          tabBarIcon: ({ color }) => <TabBarIcon name="qrcode" color={color} />,
          tabBarAccessibilityLabel: 'Code tab',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabBarIcon name="menu" color={color} />,
          tabBarAccessibilityLabel: 'More tab',
        }}
      />
    </Tabs>
  );
}
