import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function TopBar() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <Image source={require('@/assets/AppIcons/appstore.png')} style={styles.logo} />
        <ThemedText type="title" style={styles.title}>Yessal Laverie</ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: Colors.background,
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e6e6e6',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    color: Colors.tint,
  },
});
