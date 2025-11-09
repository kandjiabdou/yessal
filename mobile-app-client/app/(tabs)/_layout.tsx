import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import BottomBar from '@/components/ui/BottomBar';
import TopBar from '@/components/ui/TopBar';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const TABS = [
  { name: 'index', title: 'Accueil', icon: 'house.fill' },
  { name: 'collecte', title: 'Collecte', icon: 'bag.fill' },
  { name: 'commandes', title: 'Commandes', icon: 'list.bullet' },
  { name: 'profil', title: 'Profil', icon: 'person.fill' },
];

const renderBottomBar = (props: any) => <BottomBar {...props} />;

export default function TabLayout() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <TopBar />
      <ThemedView style={{ flex: 1 }}>
        <Tabs
          tabBar={renderBottomBar}
          screenOptions={{
            tabBarActiveTintColor: Colors.tint,
            headerShown: false,
            tabBarButton: HapticTab,
          }}>
          {TABS.map((t) => (
            <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
          ))}
        </Tabs>
      </ThemedView>
    </ThemedView>
  );
}
