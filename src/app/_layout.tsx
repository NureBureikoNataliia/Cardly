import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Platform, Pressable, View } from 'react-native';

import { useColorScheme } from '@/src/components/useColorScheme';
import { LanguageDropdown } from '@/src/components/LanguageDropdown';
import Sidebar from '@/src/components/Sidebar';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider } from '@/src/contexts/LanguageContext';
import { StudySettingsProvider } from '@/src/contexts/StudySettingsContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // При перезагрузке начальным маршрутом будет (tabs)
  initialRouteName: '(tabs)',
};

// Предотвращаем автоматическое скрытие сплэш-скрина
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
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Оборачиваем навигацию в провайдер данных о пользователе
  return (
    <LanguageProvider>
      <StudySettingsProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </StudySettingsProvider>
    </LanguageProvider>
  );
}

const isWeb = Platform.OS === 'web';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
    <View style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <LanguageDropdown />
      <Pressable onPress={() => router.push('/modal')}>
        {({ pressed }) => (
          <FontAwesome
            name="info-circle"
            size={25}
            color="#111827"
            style={{ opacity: pressed ? 0.5 : 1 }}
          />
        )}
      </Pressable>
    </View>
  );

  const stackNav = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerShadowVisible: true,
        headerTintColor: '#1f2937',
        headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        headerRight: sharedHeaderRight,
        animation: 'slide_from_right',
      }}
    >
      {/* Auth — without header */}
      <Stack.Screen name="auth/login"  options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false, animation: 'fade' }} />

      {/* Tabs — own header inside */}
      <Stack.Screen name="(tabs)"      options={{ headerShown: false }} />

      <Stack.Screen name="deck-detail"  options={{ headerShown: true }} />
      <Stack.Screen name="publicdecks"  options={{ headerShown: true }} />
      <Stack.Screen name="deck-review"  options={{ headerShown: true }} />
      <Stack.Screen name="deck-study"   options={{ headerShown: true }} />
      <Stack.Screen name="settings"     options={{ headerShown: true }} />
      <Stack.Screen name="add-deck"     options={{ headerShown: true }} />
      <Stack.Screen name="add-card"     options={{ headerShown: true }} />
      <Stack.Screen name="statistics"   options={{ headerShown: true }} />
      <Stack.Screen name="help"         options={{ headerShown: true }} />

      {/* Modal — no headerRight buttons */}
      <Stack.Screen
        name="modal"
        options={{ presentation: 'modal', title: 'Info', headerRight: undefined }}
      />
    </Stack>
  );

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {showSidebar ? (
        // Web + authenticated: flex row [Sidebar | content]
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Sidebar />
          <View style={{ flex: 1, overflow: 'hidden' }}>
            {stackNav}
          </View>
        </View>
      ) : (
        // Mobile or not-authenticated: just the stack
        stackNav
      )}
    </ThemeProvider>
  );
}