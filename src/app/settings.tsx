import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View as RNView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import ConfirmModal from '@/src/components/ConfirmModal';
import { Text, View } from '@/src/components/Themed';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useStudySettings } from '@/src/contexts/StudySettingsContext';
import { supabase } from '@/src/lib/supabase';
import { useAppColors } from '@/src/contexts/ThemeContext';
import type { User } from '@supabase/supabase-js';

function authProviderLabel(user: User | null, t: (key: string) => string): string {
  if (!user) return '—';
  const ids = user.identities ?? [];
  const providers = new Set(ids.map((i) => i.provider));
  if (providers.has('google')) return t('authProviderGoogle');
  if (providers.has('email')) return t('authProviderEmail');
  const meta = user.app_metadata?.provider;
  if (meta === 'email') return t('authProviderEmail');
  return typeof meta === 'string' ? meta : '—';
}

export default function SettingsScreen() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const C = useAppColors();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings') });
  }, [navigation, t]);

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
  const [activeSection, setActiveSection] = useState<'account' | 'notifications' | 'learning'>(
    'account'
  );
  const { settings: studySettings, updateSettings } = useStudySettings();

  // ── Notification preferences ──
  type NotifPrefs = {
    studyReminder: boolean;
    studyReminderHour: number;
    streakReminder: boolean;
    weeklySummary: boolean;
    newCards: boolean;
  };
  const defaultNotifPrefs: NotifPrefs = {
    studyReminder: false,
    studyReminderHour: 9,
    streakReminder: true,
    weeklySummary: false,
    newCards: true,
  };
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(defaultNotifPrefs);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const saved = user.user_metadata?.notifications as NotifPrefs | undefined;
    if (saved) setNotifPrefs({ ...defaultNotifPrefs, ...saved });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSaveNotif = async (patch: Partial<NotifPrefs>) => {
    const next = { ...notifPrefs, ...patch };
    setNotifPrefs(next);
    setSavingNotif(true);
    setNotifMsg(null);
    const { error: e } = await updateMetadata({ notifications: next as unknown as string });
    setSavingNotif(false);
    setNotifMsg(e ? t('notifSaveError') : t('notifSaved'));
    setTimeout(() => setNotifMsg(null), 3000);
  };

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
    <ScrollView style={[styles.container, { backgroundColor: C.bg }]} contentContainerStyle={styles.contentOuter}><View style={styles.content}>
      <Text style={styles.title}>{t('account')}</Text>

      <View style={[styles.topMenuCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={styles.topMenuTitle}>{t('settings')}</Text>
        <Text style={[styles.topMenuSubtitle, { color: C.textSub }]}>{t('settingsMenuSubtitle')}</Text>
        <RNView style={styles.topMenuTabs}>
          {(['account', 'notifications', 'learning'] as const).map((sec) => {
            const isActive = activeSection === sec;
            return (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.topMenuTab,
                  { backgroundColor: C.surface, borderColor: C.border },
                  isActive && { backgroundColor: C.isDark ? C.tint : '#111827', borderColor: C.isDark ? C.tint : '#111827' },
                ]}
                onPress={() => setActiveSection(sec)}
              >
                <Text style={[styles.topMenuTabText, isActive && styles.topMenuTabTextActive]}>
                  {sec === 'account' ? t('accountSettingsTab') : sec === 'notifications' ? t('notificationsTab') : t('learningTab')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </RNView>
      </View>

      {activeSection === 'account' ? (
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
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
            <TouchableOpacity style={[styles.avatarEditButton, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => setEditingField('avatar')}>
              <Feather name="edit-2" size={16} color={C.text} />
            </TouchableOpacity>
          </RNView>
        </RNView>

        {editingField === 'avatar' && (
          <RNView style={styles.editBlock}>
            <Text style={styles.fieldLabel}>{t('avatarUrl')}</Text>
            <TextInput
              style={[styles.inlineInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              placeholderTextColor={C.placeholder}
              autoCapitalize="none"
              editable={!savingAvatar && !deletingAccount}
            />
            <RNView style={styles.inlineActions}>
              <TouchableOpacity
                style={[styles.buttonSecondary, (savingAvatar || deletingAccount) && styles.buttonDisabled]}
                onPress={handleSaveAvatar}
                disabled={savingAvatar || deletingAccount}
              >
                {savingAvatar ? <ActivityIndicator color={C.text} /> : <Text style={[styles.buttonSecondaryText, { color: C.text }]}>{t('save')}</Text>}
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

          <RNView style={[styles.securitySection, { borderTopColor: C.border }]}>
          <Text style={styles.securityTitle}>{t('accountSecurity')}</Text>

          <RNView style={styles.infoRow}>
            <RNView style={styles.infoRowText}>
              <Text style={styles.infoLabel}>{t('username')}</Text>
              {editingField === 'username' ? (
                <TextInput
                  style={[styles.inlineInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t('username')}
                  placeholderTextColor={C.placeholder}
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
                    <ActivityIndicator color={C.text} />
                  ) : (
                    <Text style={[styles.buttonSecondaryText, { color: C.text }]}>{t('save')}</Text>
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
                style={[styles.buttonOutline, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setEditingField('username')}
                disabled={deletingAccount}
              >
                <Text style={[styles.buttonOutlineText, { color: C.text }]}>{t('change')}</Text>
              </TouchableOpacity>
            )}
          </RNView>

          <RNView style={styles.infoRow}>
            <RNView style={styles.infoRowText}>
              <Text style={styles.infoLabel}>{t('email')}</Text>
              {editingField === 'email' ? (
                <TextInput
                  style={[styles.inlineInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('email')}
                  placeholderTextColor={C.placeholder}
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
                    <ActivityIndicator color={C.text} />
                  ) : (
                    <Text style={[styles.buttonSecondaryText, { color: C.text }]}>{t('save')}</Text>
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
                style={[styles.buttonOutline, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setEditingField('email')}
                disabled={deletingAccount}
              >
                <Text style={[styles.buttonOutlineText, { color: C.text }]}>{t('change')}</Text>
              </TouchableOpacity>
            )}
          </RNView>

          <RNView style={styles.infoRow}>
            <RNView style={styles.infoRowText}>
              <Text style={styles.infoLabel}>{t('authSignInMethod')}</Text>
              <Text style={styles.infoValue}>{authProviderLabel(user, t)}</Text>
              <Text style={styles.infoSubText}>{t('connectedAccountHint')}</Text>
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
      ) : activeSection === 'notifications' ? (
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={styles.sectionHeader}>{t('notificationsTab')}</Text>

          {/* Browser note */}
          <RNView style={styles.notifNote}>
            <Feather name="info" size={14} color="#6366f1" />
            <Text style={styles.notifNoteTxt}>{t('notifBrowserNote')}</Text>
          </RNView>

          {/* Study reminder */}
          <RNView style={styles.notifRow}>
            <RNView style={styles.notifRowLeft}>
              <RNView style={styles.notifIconWrap}>
                <Feather name="bell" size={18} color="#6366f1" />
              </RNView>
              <RNView style={styles.notifRowText}>
                <Text style={styles.infoLabel}>{t('notifStudyReminder')}</Text>
                <Text style={styles.infoSubText}>{t('notifStudyReminderDesc')}</Text>
              </RNView>
            </RNView>
            <Switch
              value={notifPrefs.studyReminder}
              onValueChange={v => handleSaveNotif({ studyReminder: v })}
              trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }}
              thumbColor={notifPrefs.studyReminder ? '#6366f1' : '#f4f4f5'}
            />
          </RNView>

          {/* Time picker (visible only when study reminder is on) */}
          {notifPrefs.studyReminder && (
            <RNView style={styles.notifTimeRow}>
              <Text style={styles.fieldLabel}>{t('notifStudyTime')}</Text>
              <RNView style={styles.srsHourRow}>
                <TouchableOpacity
                  style={[styles.srsHourButton, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => handleSaveNotif({ studyReminderHour: (notifPrefs.studyReminderHour + 23) % 24 })}
                >
                  <Feather name="minus" size={20} color={C.text} />
                </TouchableOpacity>
                <Text style={[styles.srsHourValue, { color: C.text }]}>
                  {String(notifPrefs.studyReminderHour).padStart(2, '0')}:00
                </Text>
                <TouchableOpacity
                  style={[styles.srsHourButton, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => handleSaveNotif({ studyReminderHour: (notifPrefs.studyReminderHour + 1) % 24 })}
                >
                  <Feather name="plus" size={20} color={C.text} />
                </TouchableOpacity>
              </RNView>
            </RNView>
          )}

          <RNView style={styles.notifDivider} />

          {/* Streak reminder */}
          <RNView style={styles.notifRow}>
            <RNView style={styles.notifRowLeft}>
              <RNView style={[styles.notifIconWrap, { backgroundColor: '#fef3c7' }]}>
                <Feather name="zap" size={18} color="#d97706" />
              </RNView>
              <RNView style={styles.notifRowText}>
                <Text style={styles.infoLabel}>{t('notifStreakReminder')}</Text>
                <Text style={styles.infoSubText}>{t('notifStreakReminderDesc')}</Text>
              </RNView>
            </RNView>
            <Switch
              value={notifPrefs.streakReminder}
              onValueChange={v => handleSaveNotif({ streakReminder: v })}
              trackColor={{ false: '#e5e7eb', true: '#fde68a' }}
              thumbColor={notifPrefs.streakReminder ? '#d97706' : '#f4f4f5'}
            />
          </RNView>

          <RNView style={styles.notifDivider} />

          {/* New cards */}
          <RNView style={styles.notifRow}>
            <RNView style={styles.notifRowLeft}>
              <RNView style={[styles.notifIconWrap, { backgroundColor: '#d1fae5' }]}>
                <Feather name="layers" size={18} color="#059669" />
              </RNView>
              <RNView style={styles.notifRowText}>
                <Text style={styles.infoLabel}>{t('notifNewCards')}</Text>
                <Text style={styles.infoSubText}>{t('notifNewCardsDesc')}</Text>
              </RNView>
            </RNView>
            <Switch
              value={notifPrefs.newCards}
              onValueChange={v => handleSaveNotif({ newCards: v })}
              trackColor={{ false: '#e5e7eb', true: '#a7f3d0' }}
              thumbColor={notifPrefs.newCards ? '#059669' : '#f4f4f5'}
            />
          </RNView>

          <RNView style={styles.notifDivider} />

          {/* Weekly summary */}
          <RNView style={styles.notifRow}>
            <RNView style={styles.notifRowLeft}>
              <RNView style={[styles.notifIconWrap, { backgroundColor: '#fce7f3' }]}>
                <Feather name="bar-chart-2" size={18} color="#db2777" />
              </RNView>
              <RNView style={styles.notifRowText}>
                <Text style={styles.infoLabel}>{t('notifWeeklySummary')}</Text>
                <Text style={styles.infoSubText}>{t('notifWeeklySummaryDesc')}</Text>
              </RNView>
            </RNView>
            <Switch
              value={notifPrefs.weeklySummary}
              onValueChange={v => handleSaveNotif({ weeklySummary: v })}
              trackColor={{ false: '#e5e7eb', true: '#fbcfe8' }}
              thumbColor={notifPrefs.weeklySummary ? '#db2777' : '#f4f4f5'}
            />
          </RNView>

          {/* Status message */}
          {savingNotif && <ActivityIndicator color="#6366f1" style={{ alignSelf: 'flex-start' }} />}
          {notifMsg && (
            <Text style={notifMsg === t('notifSaved') ? styles.successText : styles.errorText}>
              {notifMsg}
            </Text>
          )}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={styles.sectionHeader}>{t('studySettings')}</Text>
          <Text style={styles.fieldLabel}>{t('srsDayStartTitle')}</Text>
          <Text style={styles.infoSubText}>{t('srsDayStartHint')}</Text>
          <RNView style={styles.srsHourRow}>
            <TouchableOpacity
              style={[styles.srsHourButton, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() =>
                void updateSettings({
                  srsDayStartHour: (studySettings.srsDayStartHour + 23) % 24,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t('srsDayStartTitle')}
            >
              <Feather name="minus" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.srsHourValue, { color: C.text }]} accessibilityLiveRegion="polite">
              {String(studySettings.srsDayStartHour).padStart(2, '0')}:00
            </Text>
            <TouchableOpacity
              style={[styles.srsHourButton, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() =>
                void updateSettings({
                  srsDayStartHour: (studySettings.srsDayStartHour + 1) % 24,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t('srsDayStartTitle')}
            >
              <Feather name="plus" size={22} color={C.text} />
            </TouchableOpacity>
          </RNView>
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
    maxWidth: 1104,
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
  },
  topMenuSubtitle: {
    fontSize: 16,
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
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: '#eceff3',
  },
  sectionHeader: {
    fontSize: 34,
    fontWeight: '700',
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
  },
  infoValue: {
    fontSize: 16,
  },
  infoSubText: {
    fontSize: 14,
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
  notifNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: 10,
    padding: 12,
  },
  notifNoteTxt: { flex: 1, fontSize: 13, color: '#4338ca', lineHeight: 18 },
  notifRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
    paddingVertical: 10,
  },
  notifRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  notifIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  notifRowText: { flex: 1, gap: 5 },
  notifDivider: { height: 1, backgroundColor: '#f3f4f6' },
  notifTimeRow: { paddingLeft: 60, gap: 8 },
  srsHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  srsHourButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  srsHourValue: {
    fontSize: 28,
    fontWeight: '700',
    minWidth: 88,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
