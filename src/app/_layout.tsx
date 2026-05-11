import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import 'react-native-reanimated';
import { Platform, Pressable, Text, View } from 'react-native';

import { useColorScheme } from '@/src/components/useColorScheme';
import DrawerMenu from '@/src/components/DrawerMenu';
import { LanguageDropdown } from '@/src/components/LanguageDropdown';
import NotificationBell from '@/src/components/NotificationBell';
import Sidebar from '@/src/components/Sidebar';
import ThemeToggle from '@/src/components/ThemeToggle';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider, useLanguage } from '@/src/contexts/LanguageContext';
import { MobileDrawerProvider, useMobileDrawerOptional } from '@/src/contexts/MobileDrawerContext';
import { SidebarDrawerProvider, useSidebarDrawer } from '@/src/contexts/SidebarDrawerContext';
import { StudySettingsProvider } from '@/src/contexts/StudySettingsContext';
import { ThemeProvider as AppThemeProvider } from '@/src/contexts/ThemeContext';
import Colors from '@/src/constants/Colors';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // After reload, the initial route is (tabs)
  initialRouteName: '(tabs)',
};

// Keep the splash screen visible until we hide it explicitly
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <LanguageProvider>
        <StudySettingsProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </StudySettingsProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}

const isWeb = Platform.OS === 'web';

function guestAllowedByPathname(pathname: string | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.replace(/\/$/, '');
  return p.endsWith('publicdecks') || p.endsWith('public/browse') || p.endsWith('deck-detail');
}

/** Minimum touch target; extra padding makes the whole left header easy to hit on web/mobile. */
const HEADER_MENU_MIN_TOUCH = 56;

function HeaderMenuTrigger({
  onPress,
  tintColor,
  textColor,
  label,
}: {
  onPress: () => void;
  tintColor: string;
  textColor: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: HEADER_MENU_MIN_TOUCH,
        minHeight: HEADER_MENU_MIN_TOUCH,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginVertical: -4,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Feather name="menu" size={24} color={tintColor} />
      {label.length > 0 ? (
        <Text style={{ marginLeft: 10, fontSize: 18, fontWeight: '700', color: textColor }}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

function NativeStackHeaderMenu() {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const headerText = Colors[colorScheme].text;
  const headerTint = Colors[colorScheme].tint;
  const mobile = useMobileDrawerOptional();
  return (
    <HeaderMenuTrigger
      onPress={() => mobile?.openMenu()}
      tintColor={headerTint}
      textColor={headerText}
      label={t('appName')}
    />
  );
}

function WebAuthenticatedShell({
  sharedHeaderRight,
}: {
  sharedHeaderRight: () => ReactNode;
}) {
  const { isCompact, toggleDrawer } = useSidebarDrawer();
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const headerBg = Colors[colorScheme].header;
  const headerText = Colors[colorScheme].text;
  const headerTint = Colors[colorScheme].tint;

  const headerLeft = useCallback(
    () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
        <HeaderMenuTrigger
          onPress={toggleDrawer}
          tintColor={headerTint}
          textColor={headerText}
          label={t('appName')}
        />
      </View>
    ),
    [toggleDrawer, headerText, headerTint, t],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {!isCompact ? <Sidebar /> : null}
        <View style={{ flex: 1, overflow: Platform.OS === 'web' ? 'visible' : 'hidden' }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: headerBg },
              headerShadowVisible: true,
              headerTintColor: headerText,
              headerTitleStyle: { fontSize: 18, fontWeight: '600' },
              headerTitle: ({ children }: { children?: string }) => (
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 18, fontWeight: '600', color: headerText, flexShrink: 1, maxWidth: Platform.OS === 'web' ? undefined : 180 }}
                >
                  {children}
                </Text>
              ),
              headerTitleContainerStyle: { flex: 1 },
              headerRight: sharedHeaderRight,
              headerLeft: isCompact ? headerLeft : undefined,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="auth/signup" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="deck-detail" options={{ headerShown: true }} />
            <Stack.Screen name="publicdecks" options={{ headerShown: true }} />
            <Stack.Screen name="public/browse" options={{ headerShown: true }} />
            <Stack.Screen name="admin" options={{ headerShown: true, title: 'Admin' }} />
            <Stack.Screen name="deck-rate" options={{ headerShown: true }} />
            <Stack.Screen name="deck-study" options={{ headerShown: true }} />
            <Stack.Screen name="settings" options={{ headerShown: true }} />
            <Stack.Screen name="add-deck" options={{ headerShown: true }} />
            <Stack.Screen name="add-card" options={{ headerShown: true }} />
            <Stack.Screen name="deck-import" options={{ headerShown: true }} />
            <Stack.Screen name="statistics" options={{ headerShown: true }} />
            <Stack.Screen name="help" options={{ headerShown: true }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Info', headerRight: () => <View style={{ marginRight: 12 }}><LanguageDropdown /></View> }}
            />
          </Stack>
        </View>
      </View>
      {isCompact ? <Sidebar /> : null}
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const headerBg = Colors[colorScheme].header;
  const headerText = Colors[colorScheme].text;
  const headerTint = Colors[colorScheme].tint;

  const openMobileMenu = useCallback(() => setMobileDrawerOpen(true), []);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'auth';
    const guestBrowseOk =
      segments[0] === 'publicdecks' ||
      segments[0] === 'deck-detail' ||
      (segments[0] === 'public' && segments[1] === 'browse') ||
      guestAllowedByPathname(isWeb ? pathname : undefined);
    if (!session && !inAuthGroup && segments.length > 0 && !guestBrowseOk) {
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router, pathname, isWeb]);

  const inAuthGroup = segments[0] === 'auth';
  // Show the sidebar on web only when the user is authenticated and NOT on auth screens
  const showSidebar = isWeb && !!session && !loading && !inAuthGroup;
  const nativeAuthenticated = !isWeb && !!session && !loading && !inAuthGroup;

  const guestBrowsing =
    !session &&
    !loading &&
    (segments[0] === 'publicdecks' ||
      segments[0] === 'deck-detail' ||
      (segments[0] === 'public' && segments[1] === 'browse') ||
      guestAllowedByPathname(isWeb ? pathname : undefined));

  const sharedHeaderRight = () => (
    <View style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {session ? (
        <>
          <NotificationBell />
          <ThemeToggle />
          <LanguageDropdown />
          <Pressable onPress={() => router.push('/modal')}>
            {({ pressed }) => (
              <FontAwesome
                name="info-circle"
                size={25}
                color={headerTint}
                style={{ opacity: pressed ? 0.5 : 1 }}
              />
            )}
          </Pressable>
        </>
      ) : guestBrowsing ? (
        <>
          <Pressable onPress={() => router.push('/auth/login' as never)} hitSlop={8}>
            <Text style={{ color: headerTint, fontSize: 16, fontWeight: '600' }}>{t('signIn')}</Text>
          </Pressable>
          <ThemeToggle />
          <LanguageDropdown />
        </>
      ) : (
        <>
          <ThemeToggle />
          <LanguageDropdown />
        </>
      )}
    </View>
  );

  const makeHeaderTitle = (color: string) =>
    ({ children }: { children?: string }) => (
      <Text
        numberOfLines={1}
        style={{ fontSize: 18, fontWeight: '600', color, flexShrink: 1, maxWidth: Platform.OS === 'web' ? undefined : 180 }}
      >
        {children}
      </Text>
    );

  const stackNav = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
        headerShadowVisible: true,
        headerTintColor: headerText,
        headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        headerTitle: makeHeaderTitle(headerText),
        headerTitleContainerStyle: { flex: 1 },
        headerRight: sharedHeaderRight,
        ...(nativeAuthenticated ? { headerLeft: () => <NativeStackHeaderMenu /> } : {}),
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="deck-detail" options={{ headerShown: true }} />
      <Stack.Screen name="publicdecks" options={{ headerShown: true }} />
      <Stack.Screen name="public/browse" options={{ headerShown: true }} />
      <Stack.Screen name="admin" options={{ headerShown: true, title: 'Admin' }} />
      <Stack.Screen name="deck-rate" options={{ headerShown: true }} />
      <Stack.Screen name="deck-study" options={{ headerShown: true }} />
      <Stack.Screen name="settings" options={{ headerShown: true }} />
      <Stack.Screen name="add-deck" options={{ headerShown: true }} />
      <Stack.Screen name="add-card" options={{ headerShown: true }} />
      <Stack.Screen name="deck-import" options={{ headerShown: true }} />
      <Stack.Screen name="statistics" options={{ headerShown: true }} />
      <Stack.Screen name="help" options={{ headerShown: true }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: 'modal', title: 'Info', headerRight: () => <View style={{ marginRight: 12 }}><LanguageDropdown /></View> }}
      />
    </Stack>
  );

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {nativeAuthenticated ? (
        <MobileDrawerProvider openMenu={openMobileMenu}>
          <View style={{ flex: 1 }}>
            <DrawerMenu visible={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} />
            {stackNav}
          </View>
        </MobileDrawerProvider>
      ) : showSidebar ? (
        <SidebarDrawerProvider>
          <WebAuthenticatedShell sharedHeaderRight={sharedHeaderRight} />
        </SidebarDrawerProvider>
      ) : (
        stackNav
      )}
    </ThemeProvider>
  );
}
