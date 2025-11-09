import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function CollecteScreen() {
  const handleRequestOrder = () => {
    Alert.alert('Commande demandée', 'Votre demande de lavage a été envoyée.');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Demander une commande de lavage</ThemedText>
      
      <ThemedView style={[styles.card, { backgroundColor: Colors.secondary }]}>
        <ThemedText type="subtitle">Service de lavage</ThemedText>
        <ThemedText>Collecte à domicile</ThemedText>
        <ThemedText>Livraison sous 24h</ThemedText>
        <ThemedText>Prix : 15€ par kg</ThemedText>
      </ThemedView>

      <TouchableOpacity style={[styles.button, { backgroundColor: Colors.primary }]} onPress={handleRequestOrder}>
        <ThemedText style={styles.buttonText}>Demander une collecte</ThemedText>
      </TouchableOpacity>
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
  card: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});