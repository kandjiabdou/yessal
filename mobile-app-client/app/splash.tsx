import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { router } from 'expo-router';

// Simple splash screen shown for 2s, then navigate to login.
export default function SplashScreen() {
  useEffect(() => {
    const t = setTimeout(() => {
      // Replace the splash route with the login route
      router.replace('/login');
    }, 2000);

    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Image
        source={require('@/assets/AppIcons/appstore.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
