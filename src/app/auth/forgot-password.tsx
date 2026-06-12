import React, { useState } from 'react';
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
import { useAppColors } from '@/src/contexts/ThemeContext';
import { authFormStyles, authInputStyle } from '@/src/components/authFormStyles';
import { mapAuthErrorMessage } from '@/src/lib/mapAuthError';
import { keyboardAvoidingBehavior } from '@/src/lib/keyboardAvoiding';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const C = useAppColors();

  const handleResetEmail = async () => {
    if (!email.trim()) {
      setError(t('emailRequired'));
      return;
    }

    setLoading(true);
    setError('');

    const { error: resetError } = await resetPassword(email.trim());

    if (resetError) {
      const message = mapAuthErrorMessage(resetError, t);
      setError(message || t('unexpectedError'));
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
      // Navigate to reset-password screen with email
      setTimeout(() => {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email.trim())}` as never);
      }, 2000);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.bg }]}
      behavior={keyboardAvoidingBehavior()}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={[{ color: C.tint, fontSize: 16, fontWeight: '600' }]}>← {t('goBack')}</Text>
          </TouchableOpacity>

          <View style={authFormStyles.header}>
            <Text style={[authFormStyles.title, { color: C.text }]}>{t('resetPassword')}</Text>
            <Text style={[authFormStyles.subtitle, { color: C.textSub, marginTop: 8 }]}>
              {sent ? t('resetPasswordEmailSent') : t('resetPasswordDescription')}
            </Text>
          </View>

          {!sent ? (
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

              <View style={styles.errorHolder}>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <TouchableOpacity
                style={[authFormStyles.button, styles.button, { backgroundColor: C.tint }, loading && styles.buttonDisabled]}
                onPress={handleResetEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('sendResetEmail')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.form, styles.successContainer]}>
              <Text style={[styles.successText, { color: C.text }]}>
                ✓ {t('resetEmailSent').replace('{email}', email)}
              </Text>
              <Text style={[styles.successSubtext, { color: C.textSub }]}>
                {t('resetEmailSentHint')}
              </Text>
              <Text style={[styles.successSubtext, { color: C.textSub, marginTop: 12, fontSize: 12 }]}>
                {t('redirectingToReset')}
              </Text>
            </View>
          )}
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
  backButton: {
    paddingVertical: 12,
  },
  form: {
    width: '100%',
    marginTop: 20,
  },
  button: {
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorHolder: {
    marginTop: 12,
    minHeight: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
