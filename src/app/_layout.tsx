import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { HeaderBackButton } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, type ReactNode } from 'react';
import 'react-native-reanimated';
import { Platform, Pressable, Text, View } from 'react-native';

import { useColorScheme } from '@/src/components/useColorScheme';
import { LanguageDropdown } from '@/src/components/LanguageDropdown';
import NotificationBell from '@/src/components/NotificationBell';
import { StudyReminderNotificationSync } from '@/src/components/StudyReminderNotificationSync';
import Sidebar, { AppLogo } from '@/src/components/Sidebar';
import ThemeToggle from '@/src/components/ThemeToggle';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider } from '@/src/contexts/LanguageContext';
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
            <StudyReminderNotificationSync />
            <RootLayoutNav />
          </AuthProvider>
        </StudySettingsProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}

const isWeb = Platform.OS === 'web';

function WebAuthenticatedShell({
  sharedHeaderRight,
}: {
  sharedHeaderRight: () => ReactNode;
}) {
  const { isCompact, toggleDrawer } = useSidebarDrawer();
  const colorScheme = useColorScheme();
  const headerBg = Colors[colorScheme].header;
  const headerText = Colors[colorScheme].text;
  const headerTint = Colors[colorScheme].tint;

  const headerLeft = useCallback(
    (props: { canGoBack?: boolean } & Record<string, unknown>) => (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
        {props.canGoBack ? (
          // On nested screens: just the back button — no hamburger clutter
          <HeaderBackButton {...(props as any)} labelVisible={false} tintColor={headerText} />
        ) : (
          // On root screens: hamburger to open the drawer
          <Pressable
            onPress={toggleDrawer}
            style={({ pressed }) => ({
              paddingVertical: 6,
              paddingHorizontal: 8,
              marginLeft: 4,
              opacity: pressed ? 0.75 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Feather name="menu" size={24} color={headerTint} />
          </Pressable>
        )}
      </View>
    ),
    [toggleDrawer, headerText],
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
            <Stack.Screen name="admin" options={{ headerShown: true, title: 'Admin' }} />
            <Stack.Screen name="deck-rate" options={{ headerShown: true }} />
            <Stack.Screen name="deck-study" options={{ headerShown: true }} />
            <Stack.Screen name="settings" options={{ headerShown: true }} />
            <Stack.Screen name="add-deck" options={{ headerShown: true }} />
            <Stack.Screen name="add-card" options={{ headerShown: true }} />
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
  const router = useRouter();
  const headerBg = Colors[colorScheme].header;
  const headerText = Colors[colorScheme].text;
  const headerTint = Colors[colorScheme].tint;

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!session && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  const inAuthGroup = segments[0] === 'auth';
  // Show the sidebar on web only when the user is authenticated and NOT on auth screens
  const showSidebar = isWeb && !!session && !loading && !inAuthGroup;

  const sharedHeaderRight = () => (
    <View style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
        headerRight: sharedHeaderRight,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="deck-detail" options={{ headerShown: true }} />
      <Stack.Screen name="publicdecks" options={{ headerShown: true }} />
      <Stack.Screen name="admin" options={{ headerShown: true, title: 'Admin' }} />
      <Stack.Screen name="deck-rate" options={{ headerShown: true }} />
      <Stack.Screen name="deck-study" options={{ headerShown: true }} />
      <Stack.Screen name="settings" options={{ headerShown: true }} />
      <Stack.Screen name="add-deck" options={{ headerShown: true }} />
      <Stack.Screen name="add-card" options={{ headerShown: true }} />
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
      {showSidebar ? (
        <SidebarDrawerProvider>
          <WebAuthenticatedShell sharedHeaderRight={sharedHeaderRight} />
        </SidebarDrawerProvider>
      ) : (
        stackNav
      )}
    </ThemeProvider>
  );
}
