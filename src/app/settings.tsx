import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View as RNView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import ConfirmModal from '@/src/components/ConfirmModal';
import { Text, View } from '@/src/components/Themed';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { supabase } from '@/src/lib/supabase';

export default function SettingsScreen() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState((user?.user_metadata?.username as string) ?? '');
  const [avatarUrl, setAvatarUrl] = useState((user?.user_metadata?.avatar_url as string) ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savingUsername, setSavingUsername] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<'avatar' | 'username' | 'email' | null>(null);
  const [activeSection, setActiveSection] = useState<'account' | 'notifications'>('account');

  useEffect(() => {
    if (!user) return;

    const metaUsername = (user.user_metadata?.username as string) ?? '';
    const emailValue = user.email ?? '';
    const usernameFallback = emailValue.includes('@') ? emailValue.split('@')[0] : '';

    setUsername(metaUsername || usernameFallback);
    setEmail(emailValue);
    setAvatarUrl((user.user_metadata?.avatar_url as string) ?? '');
  }, [user]);

  const avatarInitial = useMemo(() => {
    const value = (username || user?.email || 'U').trim();
    return value.charAt(0).toUpperCase();
  }, [username, user?.email]);
  const updateMetadata = async (patch: Record<string, string>) => {
    const currentMeta = (user?.user_metadata ?? {}) as Record<string, string>;
    return supabase.auth.updateUser({ data: { ...currentMeta, ...patch } });
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setError(t('usernameRequired'));
      setMessage(null);
      return;
    }

    setSavingUsername(true);
    setError(null);
    setMessage(null);
    const { error: updateError } = await updateMetadata({ username: username.trim() });
    setSavingUsername(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage(t('profileUpdated'));
    setEditingField(null);
  };

  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    setError(null);
    setMessage(null);
    const { error: updateError } = await updateMetadata({ avatar_url: avatarUrl.trim() || null });
    setSavingAvatar(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage(t('avatarUpdated'));
    setEditingField(null);
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      setError(t('emailRequired'));
      setMessage(null);
      return;
    }

    setSavingEmail(true);
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage(t('emailUpdateHint'));
    setEditingField(null);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setError(null);
    setMessage(null);
    let deleteError: { message?: string } | null = null;
    const firstTry = await supabase.rpc('delete_current_user');
    deleteError = firstTry.error;

    // Some Supabase projects cache RPC signatures differently.
    // Retry with an empty args object if the no-args call is not found.
    if (deleteError?.message?.includes('without parameters')) {
      const secondTry = await supabase.rpc('delete_current_user', {});
      deleteError = secondTry.error;
    }

    setDeletingAccount(false);
    setDeleteModalVisible(false);

    if (deleteError) {
      if (deleteError.message?.includes('schema cache')) {
        setError(t('deleteAccountFunctionMissing'));
      } else {
        setError(deleteError.message || t('failedToDeleteAccount'));
      }
      return;
    }

    await signOut();
    router.replace('/auth/login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentOuter}><View style={styles.content}>
      <Text style={styles.title}>{t('account')}</Text>

      <View style={styles.topMenuCard}>
        <Text style={styles.topMenuTitle}>{t('settings')}</Text>
        <Text style={styles.topMenuSubtitle}>{t('settingsMenuSubtitle')}</Text>
        <RNView style={styles.topMenuTabs}>
          <TouchableOpacity
            style={[styles.topMenuTab, activeSection === 'account' && styles.topMenuTabActive]}
            onPress={() => setActiveSection('account')}
          >
            <Text style={[styles.topMenuTabText, activeSection === 'account' && styles.topMenuTabTextActive]}>
              {t('accountSettingsTab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topMenuTab, activeSection === 'notifications' && styles.topMenuTabActive]}
            onPress={() => setActiveSection('notifications')}
          >
            <Text
              style={[
                styles.topMenuTabText,
                activeSection === 'notifications' && styles.topMenuTabTextActive,
              ]}
            >
              {t('notificationsTab')}
            </Text>
          </TouchableOpacity>
        </RNView>
      </View>

      {activeSection === 'account' ? (
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>{t('account')}</Text>

        <RNView style={styles.accountTopRow}>
          <RNView style={styles.avatarWrap}>
            {avatarUrl.trim() ? (
              <Image source={{ uri: avatarUrl.trim() }} style={styles.avatar} />
            ) : (
              <RNView style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
              </RNView>
            )}
            <TouchableOpacity style={styles.avatarEditButton} onPress={() => setEditingField('avatar')}>
              <Feather name="edit-2" size={16} color="#111827" />
            </TouchableOpacity>
          </RNView>
        </RNView>

        {editingField === 'avatar' && (
          <RNView style={styles.editBlock}>
            <Text style={styles.fieldLabel}>{t('avatarUrl')}</Text>
            <TextInput
              style={styles.inlineInput}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              autoCapitalize="none"
              editable={!savingAvatar && !deletingAccount}
            />
            <RNView style={styles.inlineActions}>
              <TouchableOpacity
                style={[styles.buttonSecondary, (savingAvatar || deletingAccount) && styles.buttonDisabled]}
                onPress={handleSaveAvatar}
                disabled={savingAvatar || deletingAccount}
              >
                {savingAvatar ? <ActivityIndicator color="#374151" /> : <Text style={styles.buttonSecondaryText}>{t('save')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonGhost}
                onPress={() => setEditingField(null)}
                disabled={savingAvatar || deletingAccount}
              >
                <Text style={styles.buttonGhostText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </RNView>
          </RNView>
        )}

        <RNView style={styles.securitySection}>
          <Text style={styles.securityTitle}>{t('accountSecurity')}</Text>

          <RNView style={styles.infoRow}>
            <RNView style={styles.infoRowText}>
              <Text style={styles.infoLabel}>{t('username')}</Text>
              {editingField === 'username' ? (
                <TextInput
                  style={styles.inlineInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t('username')}
                  autoCapitalize="none"
                  editable={!savingUsername && !deletingAccount}
                />
              ) : (
                <Text style={styles.infoValue}>{username || t('notSpecified')}</Text>
              )}
            </RNView>
            {editingField === 'username' ? (
              <RNView style={styles.inlineActions}>
                <TouchableOpacity
                  style={[styles.buttonSecondary, (savingUsername || deletingAccount) && styles.buttonDisabled]}
                  onPress={handleSaveUsername}
                  disabled={savingUsername || deletingAccount}
                >
                  {savingUsername ? (
                    <ActivityIndicator color="#374151" />
                  ) : (
                    <Text style={styles.buttonSecondaryText}>{t('save')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.buttonGhost}
                  onPress={() => setEditingField(null)}
                  disabled={savingUsername || deletingAccount}
                >
                  <Text style={styles.buttonGhostText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </RNView>
            ) : (
              <TouchableOpacity
                style={styles.buttonOutline}
                onPress={() => setEditingField('username')}
                disabled={deletingAccount}
              >
                <Text style={styles.buttonOutlineText}>{t('change')}</Text>
              </TouchableOpacity>
            )}
          </RNView>

          <RNView style={styles.infoRow}>
            <RNView style={styles.infoRowText}>
              <Text style={styles.infoLabel}>{t('email')}</Text>
              {editingField === 'email' ? (
                <TextInput
                  style={styles.inlineInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('email')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!savingEmail && !deletingAccount}
                />
              ) : (
                <Text style={styles.infoValue}>{email || t('notSpecified')}</Text>
              )}
            </RNView>
            {editingField === 'email' ? (
              <RNView style={styles.inlineActions}>
                <TouchableOpacity
                  style={[styles.buttonSecondary, (savingEmail || deletingAccount) && styles.buttonDisabled]}
                  onPress={handleSaveEmail}
                  disabled={savingEmail || deletingAccount}
                >
                  {savingEmail ? (
                    <ActivityIndicator color="#374151" />
                  ) : (
                    <Text style={styles.buttonSecondaryText}>{t('save')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.buttonGhost}
                  onPress={() => setEditingField(null)}
                  disabled={savingEmail || deletingAccount}
                >
                  <Text style={styles.buttonGhostText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </RNView>
            ) : (
              <TouchableOpacity
                style={styles.buttonOutline}
                onPress={() => setEditingField('email')}
                disabled={deletingAccount}
              >
                <Text style={styles.buttonOutlineText}>{t('change')}</Text>
              </TouchableOpacity>
            )}
          </RNView>

          <RNView style={styles.infoRow}>
            <RNView style={styles.infoRowText}>
              <Text style={styles.infoLabel}>{t('connectedAccount')}</Text>
              <Text style={styles.infoSubText}>{t('connectedAccountHint')}</Text>
            </RNView>
            <RNView style={styles.socialPill}>
              <Text style={styles.socialIcon}>G</Text>
              <Text style={styles.socialText}>{t('googleSignIn')}</Text>
            </RNView>
          </RNView>

          <RNView style={styles.deleteInlineBlock}>
            <RNView style={styles.infoRow}>
              <RNView style={styles.infoRowText}>
                <Text style={styles.infoLabel}>{t('deleteAccount')}</Text>
                <Text style={styles.infoSubText}>{t('deleteAccountHintLong')}</Text>
              </RNView>
              <TouchableOpacity
                style={[styles.deleteButtonInline, deletingAccount && styles.buttonDisabled]}
                onPress={() => setDeleteModalVisible(true)}
                disabled={deletingAccount}
              >
                <Text style={styles.deleteButtonInlineText}>{t('delete')}</Text>
              </TouchableOpacity>
            </RNView>
            <Text style={styles.deleteWarningText}>{t('deleteAccountWarning')}</Text>
          </RNView>
        </RNView>

        {message ? <Text style={styles.successText}>{message}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>{t('notificationsTab')}</Text>
          <Text style={styles.infoSubText}>{t('notificationsPlaceholder')}</Text>
        </View>
      )}

      <ConfirmModal
        visible={deleteModalVisible}
        title={t('deleteAccount')}
        message={t('deleteAccountConfirm')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        destructive
        icon="user-x"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </View></ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  contentOuter: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 12,
  },
  topMenuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eceff3',
    gap: 12,
  },
  topMenuTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
  },
  topMenuSubtitle: {
    fontSize: 16,
    color: '#374151',
    marginTop: -6,
  },
  topMenuTabs: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  topMenuTab: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  topMenuTabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  topMenuTabText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  topMenuTabTextActive: {
    color: '#fff',
  },
  title: {
    display: 'none',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#eceff3',
  },
  sectionHeader: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#65a30d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: -4,
    right: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '500',
  },
  editBlock: {
    gap: 8,
  },
  securitySection: {
    marginTop: 8,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 18,
  },
  securityTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoRowText: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
  },
  infoSubText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  inlineInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  buttonOutlineText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGhost: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  buttonGhostText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  buttonSecondary: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 110,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    gap: 10,
  },
  socialIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#db4437',
  },
  socialText: {
    fontSize: 16,
    color: '#111827',
  },
  deleteInlineBlock: {
    gap: 10,
  },
  deleteButtonInline: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  deleteButtonInlineText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteWarningText: {
    color: '#ef4444',
    fontSize: 16,
    lineHeight: 22,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successText: {
    color: '#166534',
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
});
