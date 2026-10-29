import { View, ScrollView, FlatList, StyleSheet } from 'react-native';
import { Button, Text, useThemedStyles, type AppColors } from '@sisig/ui';

const SAMPLE_ITEMS = [
  { id: '1', name: 'Classic Burger', price: '$12.99' },
  { id: '2', name: 'Sisig Bowl', price: '$10.99' },
  { id: '3', name: 'Sweet Potato Fries', price: '$5.99' },
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
    itemCard: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 16,
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    itemPrice: {
      fontSize: 14,
      color: c.primary,
      fontWeight: '500',
    },
    cartSection: {
      padding: 16,
    },
    cartTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    checkoutButton: {
      width: '100%',
    },
  });

export default function OrderScreen(): JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place an Order</Text>
      </View>

      <FlatList
        scrollEnabled={false}
        data={SAMPLE_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price}</Text>
            </View>
            <Button title="Add" onPress={() => {}} />
          </View>
        )}
      />

      <View style={styles.cartSection}>
        <Text style={styles.cartTitle}>Cart Total: $0.00</Text>
        <Button title="Checkout" onPress={() => {}} style={styles.checkoutButton} />
      </View>
    </ScrollView>
  );
}
