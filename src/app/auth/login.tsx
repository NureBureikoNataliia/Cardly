import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { BookOpen } from 'lucide-react-native';
import { AuthTopActions } from '@/src/components/AuthTopActions';
import { PasswordField } from '@/src/components/PasswordField';
import { useAppColors } from '@/src/contexts/ThemeContext';
import { authFormStyles, authInputStyle } from '@/src/components/authFormStyles';
import { mapAuthErrorMessage } from '@/src/lib/mapAuthError';
import { keyboardAvoidingBehavior } from '@/src/lib/keyboardAvoiding';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const C = useAppColors();

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('fillAllFields'));
      return;
    }

    setLoading(true);
    setError('');

    const { error, isAdmin: adminFlag } = await signIn(email, password);

    if (error) {
      const message = mapAuthErrorMessage(error, t);
      setError(message || t('authInvalidCredentials'));
      setLoading(false);
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const { error: oauthError, isAdmin: adminFlag } = await signInWithGoogle();
    setLoading(false);
    if (oauthError) {
      setError(mapAuthErrorMessage(oauthError, t));
      return;
    }
    if (Platform.OS !== 'web') {
      router.replace((adminFlag ? '/admin' : '/(tabs)') as never);
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password' as never);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.bg }]}
      behavior={keyboardAvoidingBehavior()}
    >
      <AuthTopActions />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <View style={styles.content}>
          <View style={authFormStyles.header}>
            <BookOpen size={40} color={C.tint} />
            <Text style={[authFormStyles.title, { color: C.text }]}>{t('appName')}</Text>
            <Text style={[authFormStyles.subtitle, { color: C.textSub }]}>{t('learnSmarter')}</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={authInputStyle(C)}
              placeholder={t('email')}
              placeholderTextColor={C.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <PasswordField
              placeholder={t('password')}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            <View style={styles.errorHolder}>{error ? <Text style={styles.errorText}>{error}</Text> : null}</View>

            <TouchableOpacity
              style={[authFormStyles.button, styles.button, { backgroundColor: C.tint }, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('signIn')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                authFormStyles.googleButton,
                { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleGoogle}
              disabled={loading}
            >
              <Text style={[styles.googleButtonText, { color: C.text }]}>{t('googleSignIn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} style={{ marginTop: 16, paddingVertical: 8 }}>
              <Text style={[styles.linkText, { color: C.tint, textAlign: 'center', fontSize: 14 }]}>
                {t('forgotPassword')}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: C.textSub }]}>{t('noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/auth/signup' as never)}>
                <Text style={[styles.linkText, { color: C.tint }]}>{t('signUp')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.publicDecksLink}
              onPress={() => router.push('/public/browse' as never)}
              disabled={loading}
            >
              <Text style={[styles.publicDecksLinkText, { color: C.tint }]}>{t('browsePublicDecks')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  form: {
    width: '100%',
  },
  button: {
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 0,
    textAlign: 'center',
  },
  errorHolder: {
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  publicDecksLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  publicDecksLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
