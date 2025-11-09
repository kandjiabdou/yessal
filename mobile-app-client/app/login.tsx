import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

export default function LoginScreen() {
  // default values as strings so TextInput works correctly
  const [phone, setPhone] = useState('771234576');
  const [code, setCode] = useState('2222');
  const codeRef = useRef<TextInput | null>(null);

  const handleLogin = () => {
    // hide keyboard
    Keyboard.dismiss();

    // Fake login: any input works
    if (phone && code.length === 4) {
      // replace so user can't go back to login/splash
      router.replace('/(tabs)');
    } else {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone et un code à 4 chiffres.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ flex: 1 }}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>Connexion</ThemedText>

          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.label}>Numéro de téléphone</ThemedText>
            <TextInput
              style={[styles.input, { color: Colors.text }]}
              placeholder="Entrez votre numéro"
              placeholderTextColor={Colors.icon}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => codeRef.current?.focus()}
            />
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.label}>Code à 4 chiffres</ThemedText>
            <TextInput
              ref={codeRef}
              style={[styles.input, { color: Colors.text }]}
              placeholder="0000"
              placeholderTextColor={Colors.icon}
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </ThemedView>

          <TouchableOpacity style={[styles.button, { backgroundColor: Colors.primary }]} onPress={handleLogin}>
            <ThemedText style={styles.buttonText}>Se connecter</ThemedText>
          </TouchableOpacity>
      </ThemedView>
    </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});