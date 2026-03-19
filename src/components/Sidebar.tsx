/**
 * Sidebar — web-only persistent navigation panel.
 * Rendered at the root layout level so it appears on every authenticated screen.
 * Uses flex layout (not absolute) so it never overlaps content.
 * Expands from MINI_W → FULL_W on hover via a spring animation.
 */
import Feather from '@expo/vector-icons/Feather';
import { usePathname, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

/**
 * CardlyLogo — heraldic-inspired badge for the sidebar.
 *
 * Layout (all pure-RN Views, no SVG dependency):
 *   ┌─────────────────────────────┐
 *   │  deep-indigo rounded badge  │
 *   │   ╔══════╦══════╗          │
 *   │   ║ book ║ star ║  shield  │
 *   │   ╠══════╬══════╣  divider │
 *   │   ║cards ║ bolt ║          │
 *   │   ╚══════╩══════╝          │
 *   │       gold "C" center      │
 *   └─────────────────────────────┘
 */
function AppLogo({ size = 34 }: { size?: number }) {
  const s   = size;
  const pad = s * 0.08;

  /* helper: tiny gold diamond (sparkle) */
  const Diamond = ({ top, left, sz }: { top: number; left: number; sz: number }) => (
    <View style={{
      position: 'absolute', top, left,
      width: sz, height: sz,
      backgroundColor: '#fbbf24',
      transform: [{ rotate: '45deg' }],
      borderRadius: 1,
    }} />
  );

  return (
    <View style={{
      width: s, height: s,
      borderRadius: s * 0.22,
      backgroundColor: '#3730a3',
      justifyContent: 'center', alignItems: 'center',
      overflow: 'hidden',
    }}>

      {/* ── background gradient simulation ── */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: s * 0.55,
        backgroundColor: '#4f46e5',
        borderBottomLeftRadius: s * 0.5,
        borderBottomRightRadius: s * 0.5,
        opacity: 0.9,
      }} />

      {/* ── shield outline (inner border) ── */}
      <View style={{
        position: 'absolute',
        width: s - pad * 2, height: s - pad * 2,
        borderRadius: s * 0.15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
      }} />

      {/* ── gold cross dividers ── */}
      {/* horizontal bar */}
      <View style={{
        position: 'absolute',
        left: pad, right: pad,
        top: s * 0.5 - 0.75,
        height: 1.5,
        backgroundColor: '#fbbf24',
        opacity: 0.85,
      }} />
      {/* vertical bar */}
      <View style={{
        position: 'absolute',
        top: pad, bottom: pad,
        left: s * 0.5 - 0.75,
        width: 1.5,
        backgroundColor: '#fbbf24',
        opacity: 0.85,
      }} />

      {/* ══ TOP-LEFT quadrant — mini open book ══ */}
      <View style={{
        position: 'absolute',
        top: pad + s * 0.04, left: pad + s * 0.04,
        width: s * 0.32, height: s * 0.26,
      }}>
        {/* left page */}
        <View style={{
          position: 'absolute', left: 0, top: 0,
          width: s * 0.14, height: s * 0.26,
          backgroundColor: 'rgba(255,255,255,0.85)',
          borderTopLeftRadius: 2, borderBottomLeftRadius: 2,
        }} />
        {/* right page */}
        <View style={{
          position: 'absolute', right: 0, top: 0,
          width: s * 0.14, height: s * 0.26,
          backgroundColor: 'rgba(255,255,255,0.65)',
          borderTopRightRadius: 2, borderBottomRightRadius: 2,
        }} />
        {/* spine */}
        <View style={{
          position: 'absolute',
          left: s * 0.14 - 1, top: 0,
          width: 2, height: s * 0.26,
          backgroundColor: '#6366f1',
        }} />
        {/* lines on left page */}
        <View style={{ position: 'absolute', left: 2, top: s * 0.06,  width: s * 0.09, height: 1, backgroundColor: '#6366f1' }} />
        <View style={{ position: 'absolute', left: 2, top: s * 0.11,  width: s * 0.07, height: 1, backgroundColor: '#a5b4fc' }} />
        <View style={{ position: 'absolute', left: 2, top: s * 0.16, width: s * 0.09, height: 1, backgroundColor: '#a5b4fc' }} />
      </View>

      {/* ══ TOP-RIGHT quadrant — 5-point star ══ */}
      {/* built from two rotated triangles + a central pentagon effect */}
      <View style={{
        position: 'absolute',
        top: pad + s * 0.05, right: pad + s * 0.03,
        width: s * 0.28, height: s * 0.28,
        justifyContent: 'center', alignItems: 'center',
      }}>
        {/* star: 4 rotated squares overlapping */}
        {[0, 45, 22.5, 67.5].map((deg, i) => (
          <View key={i} style={{
            position: 'absolute',
            width: s * 0.09, height: s * 0.26,
            backgroundColor: '#fbbf24',
            borderRadius: 1,
            opacity: 0.9,
            transform: [{ rotate: `${deg}deg` }],
          }} />
        ))}
        {/* center cap */}
        <View style={{
          width: s * 0.1, height: s * 0.1,
          borderRadius: s * 0.05,
          backgroundColor: '#fbbf24',
        }} />
      </View>

      {/* ══ BOTTOM-LEFT quadrant — fanned cards ══ */}
      {[
        { rot: '-18deg', op: 0.3, tx: s * 0.02 },
        { rot: '-7deg',  op: 0.55, tx: 0 },
        { rot:  '4deg',  op: 0.9, tx: -s * 0.01 },
      ].map((c, i) => (
        <View key={i} style={{
          position: 'absolute',
          bottom: pad + s * 0.02, left: pad + s * 0.02,
          width: s * 0.28, height: s * 0.22,
          borderRadius: 2,
          backgroundColor: `rgba(255,255,255,${c.op})`,
          transform: [{ rotate: c.rot }, { translateX: c.tx }],
        }} />
      ))}

      {/* ══ BOTTOM-RIGHT quadrant — lightning bolt ══ */}
      {/* rendered as two overlapping skewed rects */}
      <View style={{
        position: 'absolute',
        bottom: pad + s * 0.04, right: pad + s * 0.04,
        width: s * 0.24, height: s * 0.24,
        justifyContent: 'center', alignItems: 'center',
      }}>
        {/* upper bolt half */}
        <View style={{
          position: 'absolute',
          top: 0, right: 2,
          width: s * 0.08, height: s * 0.15,
          backgroundColor: '#fbbf24',
          borderTopLeftRadius: 1, borderTopRightRadius: 3,
          borderBottomRightRadius: 1,
          transform: [{ rotate: '18deg' }, { skewX: '-10deg' }],
        }} />
        {/* lower bolt half */}
        <View style={{
          position: 'absolute',
          bottom: 0, left: 2,
          width: s * 0.08, height: s * 0.15,
          backgroundColor: '#fbbf24',
          borderBottomLeftRadius: 3, borderBottomRightRadius: 1,
          borderTopLeftRadius: 1,
          transform: [{ rotate: '18deg' }, { skewX: '-10deg' }],
        }} />
      </View>

      {/* ══ Centre medallion ══ */}
      <View style={{
        position: 'absolute',
        width: s * 0.3, height: s * 0.3,
        borderRadius: s * 0.15,
        backgroundColor: '#fbbf24',
        borderWidth: 1.5,
        borderColor: '#f59e0b',
        justifyContent: 'center', alignItems: 'center',
        // subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.4,
        shadowRadius: 2,
        elevation: 3,
      }}>
        {/* "C" made from a thick arc: outer circle minus inner */}
        <View style={{
          width: s * 0.18, height: s * 0.18,
          borderRadius: s * 0.09,
          borderWidth: s * 0.04,
          borderColor: '#1e1b4b',
          // clip right side to form "C"
          borderRightColor: 'transparent',
          transform: [{ rotate: '30deg' }],
        }} />
      </View>

      {/* ── corner sparkle diamonds ── */}
      <Diamond top={s * 0.06}  left={s * 0.06}  sz={s * 0.055} />
      <Diamond top={s * 0.06}  left={s * 0.835} sz={s * 0.055} />
      <Diamond top={s * 0.835} left={s * 0.06}  sz={s * 0.055} />
      <Diamond top={s * 0.835} left={s * 0.835} sz={s * 0.055} />

    </View>
  );
}
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import ConfirmModal from '@/src/components/ConfirmModal';

const MINI_W = 62;
const FULL_W = 224;

const NAV_ITEMS = [
  { key: 'yourDecks',   icon: 'layers',      path: '/'            },
  { key: 'publicDecks', icon: 'globe',        path: '/publicdecks' },
  { key: 'statistics',  icon: 'bar-chart-2',  path: '/statistics'  },
  { key: 'settings',    icon: 'settings',     path: '/settings'    },
  { key: 'help',        icon: 'help-circle',  path: '/help'        },
] as const;

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [logoutModal, setLogoutModal] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;

  function expand() {
    Animated.spring(anim, {
      toValue: 1, useNativeDriver: false, tension: 210, friction: 24,
    }).start();
  }

  function collapse() {
    Animated.spring(anim, {
      toValue: 0, useNativeDriver: false, tension: 210, friction: 24,
    }).start();
  }

  const sidebarWidth = anim.interpolate({
    inputRange: [0, 1], outputRange: [MINI_W, FULL_W],
  });

  const labelOpacity = anim.interpolate({
    inputRange: [0, 0.4, 1], outputRange: [0, 0, 1],
  });

  const handleLogout = async () => {
    setLogoutModal(false);
    await signOut();
    router.replace('/auth/login' as never);
  };

  return (
    <>
      {/* @ts-ignore — onMouseEnter/Leave are valid on React Native Web */}
      <Animated.View
        style={[styles.sidebar, { width: sidebarWidth }]}
        onMouseEnter={expand}
        onMouseLeave={collapse}
      >
        {/* ── Logo ── */}
        <View style={styles.logoRow}>
          <AppLogo size={34} />
          <Animated.Text style={[styles.brandName, { opacity: labelOpacity }]} numberOfLines={1}>
            Cardly
          </Animated.Text>
        </View>

        <View style={styles.divider} />

        {/* ── Nav items ── */}
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.path ||
            (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Pressable
              key={item.key}
              // @ts-ignore
              style={({ pressed, hovered: h }: any) => [
                styles.navItem,
                active  && styles.navItemActive,
                h       && !active && styles.navItemHover,
                pressed && styles.navItemPressed,
              ]}
              onPress={() => router.push(item.path as never)}
              accessibilityRole="button"
            >
              <View style={styles.iconWrap}>
                <Feather
                  name={item.icon as any}
                  size={20}
                  color={active ? '#6366f1' : '#6b7280'}
                />
              </View>
              <Animated.Text
                style={[
                  styles.navLabel,
                  active && styles.navLabelActive,
                  { opacity: labelOpacity },
                ]}
                numberOfLines={1}
              >
                {t(item.key)}
              </Animated.Text>
            </Pressable>
          );
        })}

        <View style={{ flex: 1 }} />
        <View style={styles.divider} />

        {/* ── Logout ── */}
        <Pressable
          // @ts-ignore
          style={({ pressed, hovered: h }: any) => [
            styles.navItem,
            h       && styles.navItemHover,
            pressed && styles.navItemPressed,
          ]}
          onPress={() => setLogoutModal(true)}
          accessibilityRole="button"
        >
          <View style={styles.iconWrap}>
            <Feather name="log-out" size={20} color="#ef4444" />
          </View>
          <Animated.Text
            style={[styles.navLabel, styles.logoutLabel, { opacity: labelOpacity }]}
            numberOfLines={1}
          >
            {t('logout')}
          </Animated.Text>
        </Pressable>
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
  sidebar: {
    // NOT position:absolute — lives in the flex row, pushes content
    backgroundColor:  '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    shadowColor:      '#000',
    shadowOffset:     { width: 2, height: 0 },
    shadowOpacity:    0.06,
    shadowRadius:     10,
    elevation:        4,
    overflow:         'hidden',
    paddingTop:       14,
    paddingBottom:    16,
    zIndex:           10,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: 16,
    marginBottom:  14,
  },
  // logoCircle replaced by <AppLogo> component
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
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical:  10,
    marginHorizontal: 6,
    borderRadius:    10,
    marginBottom:     2,
  },
  navItemActive:  { backgroundColor: '#eef2ff' },
  navItemHover:   { backgroundColor: '#f9fafb' },
  navItemPressed: { backgroundColor: '#f3f4f6' },

  iconWrap: {
    width:          38,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  navLabel: {
    fontSize: 14, color: '#6b7280', flexShrink: 0, width: 150,
  },
  navLabelActive: { color: '#6366f1', fontWeight: '600' },
  logoutLabel:    { color: '#ef4444', fontWeight: '600' },
});
