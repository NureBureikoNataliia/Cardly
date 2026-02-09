import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Импортируем контекст авторизации и хук темы
import { useColorScheme } from '@/src/components/useColorScheme';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';

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
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Экран логина */}
        <Stack.Screen 
          name="auth/login" 
          options={{ 
            headerShown: false,
            animation: 'fade' 
          }} 
        />
        
        {/* Экран регистрации */}
        <Stack.Screen 
          name="auth/signup" 
          options={{ 
            headerShown: false,
            animation: 'fade' 
          }} 
        />

        {/* Основной интерфейс с табами */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false 
          }} 
        />

        {/* Модальное окно */}
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal',
            title: 'Info'
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}