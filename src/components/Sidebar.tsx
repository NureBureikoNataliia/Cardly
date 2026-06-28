/**
 * Sidebar — web-only persistent navigation panel.
 * Rendered at the root layout level so it appears on every authenticated screen.
 * Uses flex layout (not absolute) so it never overlaps content.
 * Expands from MINI_W → FULL_W on hover via a spring animation.
 */
import Feather from '@expo/vector-icons/Feather';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useSidebarDrawer } from '@/src/contexts/SidebarDrawerContext';
import { useColorScheme } from '@/src/components/useColorScheme';
import Colors from '@/src/constants/Colors';
import ConfirmModal from '@/src/components/ConfirmModal';

export function AppLogo({ size = 34 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/images/appicon.png')}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      resizeMode="cover"
      accessibilityLabel="Cardly"
    />
  );
}

const MINI_W = 62;
const FULL_W = 224;

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut, isAdmin } = useAuth();
  const { t } = useLanguage();
  const cs = useColorScheme();
  const [logoutModal, setLogoutModal] = useState(false);

  const themed = {
    surface: { backgroundColor: Colors[cs].surface },
    divider: { backgroundColor: cs === 'dark' ? '#374151' : '#f3f4f6', borderRightColor: cs === 'dark' ? '#374151' : '#e5e7eb' },
    brandName: { color: Colors[cs].text },
    navItemActive: { backgroundColor: cs === 'dark' ? '#1e1b4b' : '#f4f6ff', borderColor: cs === 'dark' ? '#4338ca' : '#e8ecff' },
    navItemHover: { backgroundColor: cs === 'dark' ? '#374151' : '#fafafa', borderColor: cs === 'dark' ? '#4b5563' : '#f1f5f9' },
    navItemPressed: { backgroundColor: cs === 'dark' ? '#374151' : '#f1f5f9' },
    navLabel: { color: cs === 'dark' ? '#9ca3af' : '#6b7280' },
    borderRight: { borderRightColor: cs === 'dark' ? '#374151' : '#e5e7eb' },
  };

  const navItems = useMemo(() => {
    const items: { key: string; icon: string; path: string }[] = [
      { key: 'yourDecks', icon: 'layers', path: '/' },
      { key: 'publicDecks', icon: 'globe', path: '/publicdecks' },
    ];
    if (isAdmin) {
      items.push({ key: 'adminPanel', icon: 'shield', path: '/admin' });
    }
    items.push(
      { key: 'statistics', icon: 'bar-chart-2', path: '/statistics' },
      { key: 'settings', icon: 'settings', path: '/settings' },
      { key: 'help', icon: 'help-circle', path: '/help' },
    );
    return items;
  }, [isAdmin]);

  const { isCompact, drawerOpen, closeDrawer, toggleDrawer } = useSidebarDrawer();

  const hoverAnim = useRef(new Animated.Value(0)).current;
  const drawerX = useRef(new Animated.Value(-FULL_W)).current;
  const drawerOpenRef = useRef(drawerOpen);
  drawerOpenRef.current = drawerOpen;

  useEffect(() => {
    if (!isCompact) {
      hoverAnim.setValue(0);
      closeDrawer();
    }
  }, [isCompact, closeDrawer, hoverAnim]);

  useEffect(() => {
    if (!isCompact) return;
    Animated.spring(drawerX, {
      toValue: drawerOpen ? 0 : -FULL_W,
      useNativeDriver: true,
      tension: 210,
      friction: 26,
    }).start();
  }, [drawerOpen, isCompact, drawerX]);

  const edgePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          if (!drawerOpenRef.current) return evt.nativeEvent.pageX < 36;
          return false;
        },
        onMoveShouldSetPanResponder: (_, g) =>
          !drawerOpenRef.current && g.dx > 8 && Math.abs(g.dy) < 36,
        onPanResponderRelease: (_, g) => {
          if (!drawerOpenRef.current && g.dx > 44) toggleDrawer();
        },
      }),
    [toggleDrawer],
  );

  function expand() {
    Animated.spring(hoverAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 210,
      friction: 24,
    }).start();
  }

  function collapse() {
    Animated.spring(hoverAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 210,
      friction: 24,
    }).start();
  }

  const sidebarWidth = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [MINI_W, FULL_W],
  });

  const labelOpacity = hoverAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  const handleLogout = async () => {
    setLogoutModal(false);
    await signOut();
    router.replace('/auth/login' as never);
  };

  const navigate = (path: string) => {
    router.push(path as never);
    if (isCompact) closeDrawer();
  };

  const sidebarBody = (opts: { labelOpacityStyle: Animated.AnimatedInterpolation<number> | number }) => {
    const lo = opts.labelOpacityStyle;
    return (
      <>
        <Pressable
          style={styles.logoRow}
          onPress={isCompact ? toggleDrawer : undefined}
          disabled={!isCompact}
          accessibilityRole={isCompact ? 'button' : undefined}
          accessibilityLabel={isCompact ? 'Menu' : undefined}
        >
          <AppLogo size={34} />
          <Animated.Text style={[styles.brandName, themed.brandName, { opacity: lo }]} numberOfLines={1}>
            Cardly
          </Animated.Text>
        </Pressable>

        <View style={[styles.divider, themed.divider]} />

        {navItems.map((item) => {
          const active =
            item.path === '/admin'
              ? pathname.startsWith('/admin')
              : pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Pressable
              key={item.key}
              // @ts-ignore
              style={({ pressed, hovered: h }: any) => [
                styles.navItem,
                active && [styles.navItemActive, themed.navItemActive],
                h && !active && [styles.navItemHover, themed.navItemHover],
                pressed && [styles.navItemPressed, themed.navItemPressed],
              ]}
              onPress={() => navigate(item.path)}
              accessibilityRole="button"
            >
              <View style={styles.iconWrap}>
                <Feather name={item.icon as any} size={20} color={active ? '#4f46e5' : (cs === 'dark' ? '#9ca3af' : '#64748b')} />
              </View>
              <Animated.Text
                style={[styles.navLabel, themed.navLabel, active && styles.navLabelActive, { opacity: lo }]}
                numberOfLines={1}
              >
                {t(item.key)}
              </Animated.Text>
            </Pressable>
          );
        })}

        <View style={{ flex: 1 }} />
        <View style={[styles.divider, themed.divider]} />

        <Pressable
          // @ts-ignore
          style={({ pressed, hovered: h }: any) => [
            styles.navItem,
            h && [styles.navItemHover, themed.navItemHover],
            pressed && [styles.navItemPressed, themed.navItemPressed],
          ]}
          onPress={() => setLogoutModal(true)}
          accessibilityRole="button"
        >
          <View style={styles.iconWrap}>
            <Feather name="log-out" size={20} color="#ef4444" />
          </View>
          <Animated.Text style={[styles.navLabel, styles.logoutLabel, { opacity: lo }]} numberOfLines={1}>
            {t('logout')}
          </Animated.Text>
        </Pressable>
      </>
    );
  };

  if (isCompact) {
    return (
      <View style={styles.drawerRoot} pointerEvents="box-none">
        {!drawerOpen ? (
          <View style={styles.edgeHit} {...edgePan.panHandlers} collapsable={false} />
        ) : null}

        {drawerOpen ? (
          <Pressable style={styles.backdrop} onPress={closeDrawer} accessibilityLabel="Close menu" />
        ) : null}

        <Animated.View style={[styles.sidebarDrawer, themed.surface, themed.borderRight, { width: FULL_W, transform: [{ translateX: drawerX }] }]}>
          {sidebarBody({ labelOpacityStyle: 1 })}
        </Animated.View>

        <ConfirmModal
          visible={logoutModal}
          title={t('logout')}
          message={t('logoutConfirm')}
          confirmText={t('logout')}
          cancelText={t('cancel')}
          destructive
          icon="log-out"
          onConfirm={handleLogout}
          onCancel={() => setLogoutModal(false)}
        />
      </View>
    );
  }

  return (
    <>
      <Animated.View
        style={[styles.sidebar, themed.surface, themed.borderRight, { width: sidebarWidth }]}
        {...({ onMouseEnter: expand, onMouseLeave: collapse } as object)}
      >
        {sidebarBody({ labelOpacityStyle: labelOpacity })}
      </Animated.View>

      <ConfirmModal
        visible={logoutModal}
        title={t('logout')}
        message={t('logoutConfirm')}
        confirmText={t('logout')}
        cancelText={t('cancel')}
        destructive
        icon="log-out"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  edgeHit: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 102,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    zIndex: 100,
  },
  sidebarDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingTop: 20,
    paddingBottom: 20,
    zIndex: 101,
    overflow: 'hidden',
  },
  sidebar: {
    backgroundColor:  '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    overflow:         'hidden',
    paddingTop:       20,
    paddingBottom:    20,
    zIndex:           10,
  },

  logoRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 7,
    marginHorizontal:  6,
    marginBottom:      14,
    height:            48,
  },
  brandName: {
    marginLeft: 10,
    fontSize:   17,
    fontWeight: '700',
    color:      '#111827',
    flexShrink: 0,
  },

  divider: {
    height:           1,
    backgroundColor:  '#f3f4f6',
    marginHorizontal: 10,
    marginVertical:   6,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginHorizontal: 6,
    borderRadius: 12,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'stretch',
  },
  navItemActive:  { backgroundColor: '#f4f6ff', borderColor: '#e8ecff' },
  navItemHover:   { backgroundColor: '#fafafa', borderColor: '#f1f5f9' },
  navItemPressed: { backgroundColor: '#f1f5f9' },

  iconWrap: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  navLabel: {
    fontSize:   14,
    color:      '#6b7280',
    flexShrink: 0,
    width:      140,
    marginLeft: 2,
  },
  navLabelActive: { color: '#6366f1', fontWeight: '600' },
  logoutLabel:    { color: '#ef4444', fontWeight: '600' },
});
