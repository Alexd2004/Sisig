import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, useAppColors, useThemedStyles, type AppColors } from '@sisig/ui';

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

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    menuItem: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginVertical: 6,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    menuLabel: {
      flex: 1,
      marginLeft: 16,
      fontSize: 16,
      fontWeight: '500',
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
      color: c.placeholder,
      marginBottom: 8,
    },
    copyrightText: {
      fontSize: 11,
      color: c.placeholder,
    },
  });

function MenuItemCard({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}): JSX.Element {
  const colors = useAppColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <MaterialCommunityIcons name={icon as IconName} size={24} color={colors.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.placeholder} />
    </Pressable>
  );
}

export default function MoreScreen(): JSX.Element {
  const styles = useThemedStyles(createStyles);

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
