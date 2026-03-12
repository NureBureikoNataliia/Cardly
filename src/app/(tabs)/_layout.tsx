import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import DrawerMenu from '@/src/components/DrawerMenu';
import { LanguageDropdown } from '@/src/components/LanguageDropdown';
import { useClientOnlyValue } from '@/src/components/useClientOnlyValue';
import { useColorScheme } from '@/src/components/useColorScheme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import Colors from '@/src/constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: useClientOnlyValue(false, true),
          tabBarStyle: { display: 'none' },
          headerLeft: () => (
            <Pressable onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
              <Feather name="menu" size={24} color={Colors[colorScheme ?? 'light'].text} />
            </Pressable>
          ),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('appName'),
            headerRight: () => (
              <View style={styles.headerRight}>
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
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  menuBtn: {
    padding: 4,
  },
});
