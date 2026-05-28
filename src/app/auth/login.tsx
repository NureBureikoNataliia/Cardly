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
      setError(mapAuthErrorMessage(error, t));
      setLoading(false);
    } else {
      router.replace((adminFlag ? '/admin' : '/(tabs)') as never);
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[authFormStyles.button, styles.button, loading && styles.buttonDisabled]}
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

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: C.textSub }]}>{t('noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/auth/signup' as never)}>
                <Text style={styles.linkText}>{t('signUp')}</Text>
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
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  form: {
    width: '100%',
  },
  button: {
    backgroundColor: '#3b82f6',
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
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  linkText: {
    color: '#3b82f6',
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
