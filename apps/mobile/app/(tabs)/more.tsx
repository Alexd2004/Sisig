import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const MENU_ITEMS = [
  { icon: 'history', label: 'Order History', screen: 'order-history' },
  { icon: 'account', label: 'My Profile', screen: 'profile' },
  { icon: 'map-marker', label: 'Locations', screen: 'locations' },
  { icon: 'information', label: 'About', screen: 'about' },
  { icon: 'help-circle', label: 'Help & Support', screen: 'help' },
  { icon: 'cog', label: 'Settings', screen: 'settings' },
  { icon: 'logout', label: 'Sign Out', screen: 'signout' },
];

function MenuItemCard({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <MaterialCommunityIcons name={icon as IconName} size={24} color="#007AFF" />
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
    </Pressable>
  );
}

export default function MoreScreen(): JSX.Element {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu</Text>
      </View>

      {MENU_ITEMS.map((item) => (
        <MenuItemCard
          key={item.screen}
          icon={item.icon}
          label={item.label}
          onPress={() => console.log(`Navigate to ${item.screen}`)}
        />
      ))}

      <View style={styles.footerCard}>
        <Text style={styles.footerText}>Sisig Eh! Mobile App</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
        <Text style={styles.copyrightText}>© 2024 Sisig. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  menuLabel: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  footerCard: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 11,
    color: '#bbb',
  },
});
