import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Pressable, View } from 'react-native';

// Импортируем контекст авторизации и хук темы
import { useColorScheme } from '@/src/components/useColorScheme';
import { LanguageDropdown } from '@/src/components/LanguageDropdown';
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

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth(); // Предполагаем, что AuthContext возвращает сессию и статус загрузки
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Если сессия еще загружается, ничего не делаем
    if (loading) return;

    // Проверяем, находится ли пользователь в группе (auth)
    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // Если пользователь не авторизован и НЕ в папке auth — отправляем на логин
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      // Если пользователь авторизован и находится в папке auth — отправляем в основное приложение
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
        {/* Auth — без хедера */}
        <Stack.Screen
          name="auth/login"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="auth/signup"
          options={{ headerShown: false, animation: 'fade' }}
        />

        {/* Tabs — свій хедер всередині */}
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        {/* Деталі дошки */}
        <Stack.Screen
          name="deck-detail"
          options={{ headerShown: true }}
        />

        {/* Публічні дошки */}
        <Stack.Screen
          name="publicdecks"
          options={{ headerShown: true }}
        />

        {/* Огляд карток */}
        <Stack.Screen
          name="deck-review"
          options={{ headerShown: true }}
        />

        {/* Вивчення */}
        <Stack.Screen
          name="deck-study"
          options={{ headerShown: true }}
        />

        {/* Налаштування */}
        <Stack.Screen
          name="settings"
          options={{ headerShown: true }}
        />

        {/* Додати/редагувати дошку */}
        <Stack.Screen
          name="add-deck"
          options={{ headerShown: true }}
        />

        {/* Додати/редагувати картку */}
        <Stack.Screen
          name="add-card"
          options={{ headerShown: true }}
        />

        {/* Статистика */}
        <Stack.Screen
          name="statistics"
          options={{ headerShown: true }}
        />

        {/* Допомога */}
        <Stack.Screen
          name="help"
          options={{ headerShown: true }}
        />

        {/* Модальне вікно — без кнопок */}
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Info', headerRight: undefined }}
        />
      </Stack>
    </ThemeProvider>
  );
}