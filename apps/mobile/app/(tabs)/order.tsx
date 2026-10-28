import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Button } from '@sisig/ui';

const SAMPLE_ITEMS = [
  { id: '1', name: 'Classic Burger', price: '$12.99' },
  { id: '2', name: 'Sisig Bowl', price: '$10.99' },
  { id: '3', name: 'Sweet Potato Fries', price: '$5.99' },
];

export default function OrderScreen(): JSX.Element {
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
  itemCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    color: '#007AFF',
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
