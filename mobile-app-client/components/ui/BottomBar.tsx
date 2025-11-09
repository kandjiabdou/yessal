import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from './icon-symbol';
import { Colors } from '@/constants/theme';

// Simple, clean bottom bar inspired by modern iOS styles.
// Uses inline styles for clarity; you can replace with NativeWind classes if preferred.

export default function BottomBar(props: Readonly<BottomTabBarProps>) {
  const { state, descriptors, navigation } = props;

  const shadowStyle: any = Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 8 },
    web: { boxShadow: '0px 8px 20px rgba(0,0,0,0.08)' },
  });

  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: Platform.OS === 'ios' ? 26 : 16,
        height: 70,
        borderRadius: 20,
        backgroundColor: Colors.background,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 8,
        // Platform-adaptive shadow
        ...shadowStyle,
      }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const color = isFocused ? Colors.tint : Colors.icon;

        // map route.name to our symbol names
        const ROUTE_ICON: Record<string, string> = {
          index: 'house.fill',
          collecte: 'bag.fill',
          commandes: 'list.bullet',
          profil: 'person.fill',
        };

        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel as any}
            // testID may not be present on options typing in this project
            testID={(options as any).tabBarTestID}
            onPress={onPress}
            activeOpacity={0.9}
            key={route.key}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isFocused ? Colors.primary : 'transparent',
            }}>
              <IconSymbol name={ROUTE_ICON[route.name] as any} size={24} color={isFocused ? '#fff' : color} />
            </View>
            <Text style={{ marginTop: 4, fontSize: 12, color }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
