import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const router = useRouter();
  const anim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);

    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      if (!visible) setMounted(false);
    });
  }, [visible, anim]);

  // keep it out of the render tree when closed
  if (!mounted) {
    return null;
  }

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 0],
  });

  // Close the drawer first, then navigate after the close animation finishes.
  function navigateTo(path: string) {
    onClose();
    setTimeout(() => router.push(path as never), 220);
  }

  return (
    <View style={styles.overlay}>
      {/* Tapping this area (outside the drawer) closes it */}
      <Pressable style={styles.outside} onPress={onClose} accessibilityRole="button" />

      <Animated.View style={[styles.container, { transform: [{ translateX }] }]}>
        <Text style={styles.header}>Menu</Text>

        <Pressable style={styles.item} onPress={() => navigateTo('/')} accessibilityRole="button">
          <Feather name="layers" size={18} color="#222" />
          <Text style={styles.itemText}>Decks</Text>
        </Pressable>

        <Pressable style={styles.item} onPress={() => navigateTo('/statistics')} accessibilityRole="button">
          <Feather name="bar-chart-2" size={18} color="#222" />
          <Text style={styles.itemText}>Statistics</Text>
        </Pressable>

        <Pressable style={styles.item} onPress={() => navigateTo('/settings')} accessibilityRole="button">
          <Feather name="settings" size={18} color="#222" />
          <Text style={styles.itemText}>Settings</Text>
        </Pressable>

        <Pressable style={styles.item} onPress={() => navigateTo('/help')} accessibilityRole="button">
          <Feather name="help-circle" size={18} color="#222" />
          <Text style={styles.itemText}>Help</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1000,
  },
  container: {
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 12,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  itemText: {
    marginLeft: 12,
    fontSize: 16,
  },
  outside: {
    position: 'absolute',
    left: 280,
    top: 0,
    right: 0,
    bottom: 0,
  },
});