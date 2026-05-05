import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import DrawerMenu from '@/src/components/DrawerMenu';
import { LanguageDropdown } from '@/src/components/LanguageDropdown';
import NotificationBell from '@/src/components/NotificationBell';
import ThemeToggle from '@/src/components/ThemeToggle';
import { useClientOnlyValue } from '@/src/components/useClientOnlyValue';
import { useColorScheme } from '@/src/components/useColorScheme';
import Colors from '@/src/constants/Colors';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useSidebarDrawerOptional } from '@/src/contexts/SidebarDrawerContext';

const isWeb = Platform.OS === 'web';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // Drawer state is only used on native; web has the persistent Sidebar in root layout
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useLanguage();
  const sidebarDrawer = useSidebarDrawerOptional();

  const headerLeft = isWeb
    ? sidebarDrawer?.isCompact
      ? () => (
          <Pressable
            onPress={sidebarDrawer.toggleDrawer}
            style={[styles.menuBtn, { marginLeft: 8 }]}
          >
            <Feather name="menu" size={24} color="#1f2937" />
          </Pressable>
        )
      : undefined
    : () => (
        <Pressable onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
          <Feather name="menu" size={24} color={Colors[colorScheme ?? 'light'].text} />
        </Pressable>
      );

  return (
    <>
      {/* Mobile-only overlay drawer (web uses Sidebar rendered at root level) */}
      {!isWeb && (
        <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: useClientOnlyValue(false, true),
          tabBarStyle: { display: 'none' },
          headerLeft,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('appName'),
            headerRight: () => (
              <View style={styles.headerRight}>
                <NotificationBell />
                <ThemeToggle />
                <LanguageDropdown />
                <Link href="/modal" asChild>
                  <Pressable>
                    {({ pressed }) => (
                      <FontAwesome
                        name="info-circle"
                        size={25}
                        color={Colors[colorScheme ?? 'light'].text}
                        style={{ opacity: pressed ? 0.5 : 1 }}
                      />
                    )}
                  </Pressable>
                </Link>
              </View>
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    marginRight:   8,
  },
  menuBtn: {
    padding: 4,
  },
});
