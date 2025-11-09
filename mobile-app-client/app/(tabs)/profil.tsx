import { StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function ProfilScreen() {
  const handleChangePassword = () => {
    Alert.alert('Mot de passe changé', 'Votre mot de passe a été mis à jour.');
  };

  const handleLogout = () => {
    // replace to avoid going back to profile via back button
    router.replace('/login');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Profil</ThemedText>
      
      <ThemedView style={[styles.card, { backgroundColor: Colors.secondary }]}>
        <ThemedText type="subtitle">Informations personnelles</ThemedText>
        <ThemedText>Nom : Dupont</ThemedText>
        <ThemedText>Prénom : Jean</ThemedText>
        <ThemedText>Email : jean.dupont@example.com</ThemedText>
        <ThemedText>Téléphone : 06 12 34 56 78</ThemedText>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: Colors.primary }]}>
        <ThemedText type="subtitle">Changer le mot de passe</ThemedText>
        <TextInput
          style={[styles.input, { color: Colors.text }]}
          placeholder="Nouveau mot de passe"
          placeholderTextColor={Colors.icon}
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { color: Colors.text }]}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor={Colors.icon}
          secureTextEntry
        />
        <TouchableOpacity style={[styles.button, { backgroundColor: Colors.secondary }]} onPress={handleChangePassword}>
          <ThemedText style={styles.buttonText}>Changer</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#ff4d4f', marginTop: 12 }]} onPress={handleLogout}>
          <ThemedText style={styles.buttonText}>Déconnexion</ThemedText>
        </TouchableOpacity>
      </ThemedView>
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
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});