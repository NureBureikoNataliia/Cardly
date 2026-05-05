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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useLanguage();
  const sidebarDrawer = useSidebarDrawerOptional();

  const cs = colorScheme ?? 'light';
  const headerBg = Colors[cs].header;
  const headerTint = Colors[cs].tint;
  const headerText = Colors[cs].text;

  const headerLeft = isWeb
    ? sidebarDrawer?.isCompact
      ? () => (
          <Pressable
            onPress={sidebarDrawer.toggleDrawer}
            style={[styles.menuBtn, { marginLeft: 8 }]}
          >
            <Feather name="menu" size={24} color={headerTint} />
          </Pressable>
        )
      : undefined
    : () => (
        <Pressable onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
          <Feather name="menu" size={24} color={headerTint} />
        </Pressable>
      );

  return (
    <>
      {!isWeb && (
        <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[cs].tint,
          headerShown: useClientOnlyValue(false, true),
          tabBarStyle: { display: 'none' },
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: headerText,
          headerShadowVisible: true,
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
                        color={headerTint}
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
