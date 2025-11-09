import { StyleSheet, FlatList } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const fakeOrders = [
  { id: '1', number: '#12345', status: 'Terminée', date: '10/11/2025' },
  { id: '2', number: '#12346', status: 'En cours', date: '12/11/2025' },
  { id: '3', number: '#12347', status: 'Terminée', date: '08/11/2025' },
];

export default function CommandesScreen() {
  const renderOrder = ({ item }: { item: typeof fakeOrders[0] }) => (
    <ThemedView style={[styles.orderItem, { backgroundColor: Colors.secondary }]}>
      <ThemedText type="subtitle">{item.number}</ThemedText>
      <ThemedText>Statut : {item.status}</ThemedText>
      <ThemedText>Date : {item.date}</ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Historique des commandes</ThemedText>
      
      <FlatList
        data={fakeOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  list: {
    paddingBottom: 20,
  },
  orderItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
});