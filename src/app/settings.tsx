import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  Platform,
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
import {
  openNotificationSettings,
  sendTestPushNotification,
  syncStudyDailyReminder,
} from '@/src/lib/studyReminderNotifications';
import { useLayoutWidth } from '@/src/hooks/useLayoutWidth';
import { useAppColors } from '@/src/contexts/ThemeContext';
import type { User } from '@supabase/supabase-js';

type SettingsField = 'avatar' | 'username' | 'email' | 'delete';

const ACCOUNT_COMPACT_WIDTH = 520;

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

function getSavedProfileValues(user: User | null) {
  const metaUsername = (user?.user_metadata?.username as string) ?? '';
  const emailValue = user?.email ?? '';
  const usernameFallback = emailValue.includes('@') ? emailValue.split('@')[0] : '';
  return {
    username: metaUsername || usernameFallback,
    email: emailValue,
    avatarUrl: (user?.user_metadata?.avatar_url as string) ?? '',
  };
}

export default function SettingsScreen() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const C = useAppColors();
  const layoutWidth = useLayoutWidth();
  const compactAccount = layoutWidth < ACCOUNT_COMPACT_WIDTH;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings') });
  }, [navigation, t]);

  const [username, setUsername] = useState((user?.user_metadata?.username as string) ?? '');
  const [avatarUrl, setAvatarUrl] = useState((user?.user_metadata?.avatar_url as string) ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SettingsField, string>>>({});
  const [fieldMessages, setFieldMessages] = useState<Partial<Record<SettingsField, string>>>({});

  const setFieldError = (field: SettingsField, msg: string | null) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

  const setFieldMessage = (field: SettingsField, msg: string | null) => {
    setFieldMessages((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

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
  };
  const defaultNotifPrefs: NotifPrefs = {
    studyReminder: false,
    studyReminderHour: 9,
  };
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(defaultNotifPrefs);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushMsg, setTestPushMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const saved = user.user_metadata?.notifications as Partial<NotifPrefs> | undefined;
    if (saved) {
      setNotifPrefs({
        studyReminder: saved.studyReminder ?? defaultNotifPrefs.studyReminder,
        studyReminderHour: saved.studyReminderHour ?? defaultNotifPrefs.studyReminderHour,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSaveNotif = async (patch: Partial<NotifPrefs>) => {
    const next: NotifPrefs = {
      studyReminder: patch.studyReminder ?? notifPrefs.studyReminder,
      studyReminderHour: patch.studyReminderHour ?? notifPrefs.studyReminderHour,
    };
    setNotifPrefs(next);
    setSavingNotif(true);
    setNotifMsg(null);
    const { error: e } = await updateMetadata({ notifications: next });
    setSavingNotif(false);

    if (e) {
      setNotifMsg(t('notifSaveError'));
      setTimeout(() => setNotifMsg(null), 3000);
      return;
    }

    const needsSync =
      patch.studyReminder !== undefined || patch.studyReminderHour !== undefined;
    if (needsSync) {
      const r = await syncStudyDailyReminder({
        enabled: next.studyReminder,
        hour: next.studyReminderHour,
        title: t('pushRepeatWordsTitle'),
        body: t('pushRepeatWordsBody'),
      });
      if (next.studyReminder && r.ok === false && r.reason === 'permission_denied') {
        setNotifMsg(t('notifPermissionDenied'));
        setTimeout(() => setNotifMsg(null), 5000);
        return;
      }
      if (next.studyReminder && r.ok === false && r.reason === 'web') {
        setNotifMsg(t('notifWebReminderNote'));
        setTimeout(() => setNotifMsg(null), 5000);
        return;
      }
      if (next.studyReminder && r.ok === false && r.reason === 'expo_go') {
        setNotifMsg(t('notifExpoGoReminderNote'));
        setTimeout(() => setNotifMsg(null), 8000);
        return;
      }
    }

    setNotifMsg(t('notifSaved'));
    setTimeout(() => setNotifMsg(null), 3000);
  };

  const handleSendTestPush = async () => {
    setTestPushLoading(true);
    setTestPushMsg(null);
    const result = await sendTestPushNotification({
      title: t('adminTestPushTitle'),
      body: t('adminTestPushBody'),
    });
    setTestPushLoading(false);
    if (result.ok) {
      setTestPushMsg(t('adminTestPushSent'));
    } else {
      const reasonMsg =
        result.reason === 'permission_denied'
          ? t('notifPermissionDenied')
          : result.reason === 'web'
            ? t('notifWebReminderNote')
            : result.reason === 'expo_go'
              ? t('notifExpoGoReminderNote')
              : t('adminTestPushFailed');
      setTestPushMsg(reasonMsg);
    }
    setTimeout(() => setTestPushMsg(null), 6000);
  };

  useEffect(() => {
    if (!user) return;
    const saved = getSavedProfileValues(user);
    setUsername(saved.username);
    setEmail(saved.email);
    setAvatarUrl(saved.avatarUrl);
  }, [user]);

  const resetFieldFromUser = (field: 'avatar' | 'username' | 'email') => {
    const saved = getSavedProfileValues(user);
    if (field === 'username') setUsername(saved.username);
    if (field === 'email') setEmail(saved.email);
    if (field === 'avatar') setAvatarUrl(saved.avatarUrl);
  };

  const handleCancelEdit = (field: 'avatar' | 'username' | 'email') => {
    resetFieldFromUser(field);
    setEditingField(null);
    setFieldError(field, null);
    setFieldMessage(field, null);
  };

  const avatarInitial = useMemo(() => {
    const value = (username || user?.email || 'U').trim();
    return value.charAt(0).toUpperCase();
  }, [username, user?.email]);
  const updateMetadata = async (patch: Record<string, unknown>) => {
    const currentMeta = { ...(user?.user_metadata ?? {}) } as Record<string, unknown>;
    return supabase.auth.updateUser({ data: { ...currentMeta, ...patch } as Record<string, unknown> });
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setFieldError('username', t('usernameRequired'));
      setFieldMessage('username', null);
      return;
    }

    setSavingUsername(true);
    setFieldError('username', null);
    setFieldMessage('username', null);
    const { error: updateError } = await updateMetadata({ username: username.trim() });
    setSavingUsername(false);

    if (updateError) {
      setFieldError('username', updateError.message);
      return;
    }
    setFieldMessage('username', t('profileUpdated'));
    setEditingField(null);
  };

  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    setFieldError('avatar', null);
    setFieldMessage('avatar', null);
    const { error: updateError } = await updateMetadata({ avatar_url: avatarUrl.trim() || null });
    setSavingAvatar(false);

    if (updateError) {
      setFieldError('avatar', updateError.message);
      return;
    }
    setFieldMessage('avatar', t('avatarUpdated'));
    setEditingField(null);
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      setFieldError('email', t('emailRequired'));
      setFieldMessage('email', null);
      return;
    }

    setSavingEmail(true);
    setFieldError('email', null);
    setFieldMessage('email', null);
    const { error: updateError } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);

    if (updateError) {
      setFieldError('email', updateError.message);
      return;
    }
    setFieldMessage('email', t('emailUpdateHint'));
    setEditingField(null);
  };

  const renderFieldFeedback = (field: SettingsField) => {
    const err = fieldErrors[field];
    const msg = fieldMessages[field];
    if (err) return <Text style={styles.fieldFeedbackError}>{err}</Text>;
    if (msg) return <Text style={styles.fieldFeedbackSuccess}>{msg}</Text>;
    return null;
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setFieldError('delete', null);
    setFieldMessage('delete', null);
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
        setFieldError('delete', t('deleteAccountFunctionMissing'));
      } else {
        setFieldError('delete', deleteError.message || t('failedToDeleteAccount'));
      }
      return;
    }

    await signOut();
    router.replace('/auth/login');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.bg }]}
      contentContainerStyle={styles.contentOuter}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    ><View style={styles.content}>
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
        <Text style={[styles.sectionHeader, compactAccount && styles.sectionHeaderCompact]}>
          {t('account')}
        </Text>

        <RNView style={styles.accountTopRow}>
          <RNView style={styles.avatarWrap}>
            {avatarUrl.trim() ? (
              <Image source={{ uri: avatarUrl.trim() }} style={styles.avatar} />
            ) : (
              <RNView style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
              </RNView>
            )}
            <TouchableOpacity
              style={[styles.avatarEditButton, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => {
                resetFieldFromUser('avatar');
                setEditingField('avatar');
                setFieldError('avatar', null);
                setFieldMessage('avatar', null);
              }}
            >
              <Feather name="edit-2" size={16} color={C.text} />
            </TouchableOpacity>
          </RNView>
        </RNView>

        {editingField === 'avatar' && (
          <RNView style={styles.editBlock}>
            <Text style={styles.fieldLabel}>{t('avatarUrl')}</Text>
            <TextInput
              style={[
                styles.inlineInput,
                compactAccount && styles.inlineInputFull,
                { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text },
              ]}
              value={avatarUrl}
              onChangeText={(text) => {
                setAvatarUrl(text);
                setFieldError('avatar', null);
                setFieldMessage('avatar', null);
              }}
              placeholder="https://..."
              placeholderTextColor={C.placeholder}
              autoCapitalize="none"
              editable={!savingAvatar && !deletingAccount}
            />
            {renderFieldFeedback('avatar')}
            <RNView style={[styles.inlineActions, compactAccount && styles.inlineActionsStacked]}>
              <TouchableOpacity
                style={[
                  styles.buttonSecondary,
                  compactAccount && styles.buttonSecondaryFlex,
                  (savingAvatar || deletingAccount) && styles.buttonDisabled,
                ]}
                onPress={handleSaveAvatar}
                disabled={savingAvatar || deletingAccount}
              >
                {savingAvatar ? <ActivityIndicator color={C.text} /> : <Text style={[styles.buttonSecondaryText, { color: C.text }]}>{t('save')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonGhost, compactAccount && styles.buttonGhostFlex]}
                onPress={() => handleCancelEdit('avatar')}
                disabled={savingAvatar || deletingAccount}
              >
                <Text style={styles.buttonGhostText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </RNView>
          </RNView>
        )}
        {!editingField && renderFieldFeedback('avatar')}

          <RNView style={[styles.securitySection, { borderTopColor: C.border }]}>
          <Text style={[styles.securityTitle, compactAccount && styles.securityTitleCompact]}>
            {t('accountSecurity')}
          </Text>

          <RNView
            style={[
              styles.infoRow,
              compactAccount && editingField === 'username' && styles.infoRowStacked,
            ]}
          >
            <RNView
              style={[
                styles.infoRowText,
                compactAccount && editingField === 'username' && styles.infoRowTextStacked,
              ]}
            >
              <Text style={styles.infoLabel}>{t('username')}</Text>
              {editingField === 'username' ? (
                <TextInput
                  style={[
                    styles.inlineInput,
                    compactAccount && styles.inlineInputFull,
                    { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text },
                  ]}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setFieldError('username', null);
                    setFieldMessage('username', null);
                  }}
                  placeholder={t('username')}
                  placeholderTextColor={C.placeholder}
                  autoCapitalize="none"
                  editable={!savingUsername && !deletingAccount}
                />
              ) : (
                <Text style={styles.infoValue}>{username || t('notSpecified')}</Text>
              )}
              {renderFieldFeedback('username')}
            </RNView>
            {editingField === 'username' ? (
              <RNView style={[styles.inlineActions, compactAccount && styles.inlineActionsStacked]}>
                <TouchableOpacity
                  style={[
                    styles.buttonSecondary,
                    compactAccount && styles.buttonSecondaryFlex,
                    (savingUsername || deletingAccount) && styles.buttonDisabled,
                  ]}
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
                  style={[styles.buttonGhost, compactAccount && styles.buttonGhostFlex]}
                  onPress={() => handleCancelEdit('username')}
                  disabled={savingUsername || deletingAccount}
                >
                  <Text style={styles.buttonGhostText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </RNView>
            ) : (
              <TouchableOpacity
                style={[
                  styles.buttonOutline,
                  styles.infoRowAction,
                  compactAccount && styles.buttonOutlineCompact,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => {
                  resetFieldFromUser('username');
                  setEditingField('username');
                  setFieldError('username', null);
                  setFieldMessage('username', null);
                }}
                disabled={deletingAccount}
              >
                <Text style={[styles.buttonOutlineText, { color: C.text }]}>{t('change')}</Text>
              </TouchableOpacity>
            )}
          </RNView>

          <RNView
            style={[
              styles.infoRow,
              compactAccount && editingField === 'email' && styles.infoRowStacked,
            ]}
          >
            <RNView
              style={[
                styles.infoRowText,
                compactAccount && editingField === 'email' && styles.infoRowTextStacked,
              ]}
            >
              <Text style={styles.infoLabel}>{t('email')}</Text>
              {editingField === 'email' ? (
                <TextInput
                  style={[
                    styles.inlineInput,
                    compactAccount && styles.inlineInputFull,
                    { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.text },
                  ]}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setFieldError('email', null);
                    setFieldMessage('email', null);
                  }}
                  placeholder={t('email')}
                  placeholderTextColor={C.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!savingEmail && !deletingAccount}
                />
              ) : (
                <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="tail">
                  {email || t('notSpecified')}
                </Text>
              )}
              {renderFieldFeedback('email')}
            </RNView>
            {editingField === 'email' ? (
              <RNView style={[styles.inlineActions, compactAccount && styles.inlineActionsStacked]}>
                <TouchableOpacity
                  style={[
                    styles.buttonSecondary,
                    compactAccount && styles.buttonSecondaryFlex,
                    (savingEmail || deletingAccount) && styles.buttonDisabled,
                  ]}
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
                  style={[styles.buttonGhost, compactAccount && styles.buttonGhostFlex]}
                  onPress={() => handleCancelEdit('email')}
                  disabled={savingEmail || deletingAccount}
                >
                  <Text style={styles.buttonGhostText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </RNView>
            ) : (
              <TouchableOpacity
                style={[
                  styles.buttonOutline,
                  styles.infoRowAction,
                  compactAccount && styles.buttonOutlineCompact,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => {
                  resetFieldFromUser('email');
                  setEditingField('email');
                  setFieldError('email', null);
                  setFieldMessage('email', null);
                }}
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

          <RNView
            style={[
              styles.deleteInlineBlock,
              {
                borderTopColor: C.border,
                backgroundColor: C.isDark ? 'rgba(239, 68, 68, 0.06)' : 'rgba(254, 242, 242, 0.65)',
              },
            ]}
          >
            <RNView style={[styles.infoRow, styles.infoRowAlignTop]}>
              <RNView style={styles.infoRowText}>
                <Text style={[styles.infoLabel, { color: C.text }]}>{t('deleteAccount')}</Text>
                <Text style={[styles.infoSubText, { color: C.textSub }]}>{t('deleteAccountHintLong')}</Text>
              </RNView>
              <TouchableOpacity
                style={[
                  styles.deleteButtonInline,
                  styles.infoRowActionShrink,
                  compactAccount && styles.deleteButtonInlineCompact,
                  deletingAccount && styles.buttonDisabled,
                  {
                    backgroundColor: '#dc2626',
                    borderColor: C.isDark ? '#f87171' : '#b91c1c',
                  },
                ]}
                onPress={() => setDeleteModalVisible(true)}
                disabled={deletingAccount}
              >
                <Text style={styles.deleteButtonInlineText}>{t('delete')}</Text>
              </TouchableOpacity>
            </RNView>
            <RNView
              style={[
                styles.deleteWarningBox,
                {
                  backgroundColor: C.isDark ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2',
                  borderColor: C.isDark ? 'rgba(248, 113, 113, 0.4)' : '#fecaca',
                },
              ]}
            >
              <Feather
                name="alert-triangle"
                size={16}
                color={C.isDark ? '#fca5a5' : '#dc2626'}
                style={styles.deleteWarningIcon}
              />
              <Text
                style={[
                  styles.deleteWarningText,
                  { color: C.isDark ? '#fecaca' : '#b91c1c' },
                ]}
              >
                {t('deleteAccountWarning')}
              </Text>
            </RNView>
            {renderFieldFeedback('delete')}
          </RNView>
        </RNView>
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
            <RNView style={[styles.notifTimeRow, compactAccount && styles.notifTimeRowCompact]}>
              <Text style={[styles.fieldLabel, compactAccount && styles.notifTimeLabelCompact]}>
                {t('notifStudyTime')}
              </Text>
              <RNView style={[styles.srsHourRow, compactAccount && styles.srsHourRowCompact]}>
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

          {notifPrefs.studyReminder && Platform.OS === 'android' && (
            <RNView style={styles.notifAndroidHint}>
              <Text style={styles.infoSubText}>{t('notifAndroidBackgroundNote')}</Text>
              <TouchableOpacity
                style={[styles.notifSettingsLink, { borderColor: C.border }]}
                onPress={() => void openNotificationSettings()}
              >
                <Text style={[styles.notifSettingsLinkText, { color: C.tint }]}>
                  {t('notifOpenSystemSettings')}
                </Text>
              </TouchableOpacity>
            </RNView>
          )}

          <RNView style={[styles.notifDivider, { backgroundColor: C.borderLight }]} />

          {/* Test notification */}
          <RNView style={styles.notifTestSection}>
            <RNView style={styles.notifRowLeft}>
              <RNView style={[styles.notifIconWrap, { backgroundColor: C.isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]}>
                <Feather name="send" size={18} color={C.tint} />
              </RNView>
              <RNView style={styles.notifRowText}>
                <Text style={[styles.infoLabel, { color: C.text }]}>{t('adminSendTestPush')}</Text>
                <Text style={[styles.infoSubText, { color: C.textSub }]}>{t('adminSendTestPushDesc')}</Text>
              </RNView>
            </RNView>
            <TouchableOpacity
              style={[
                styles.notifTestBtn,
                { backgroundColor: C.aiButtonFill },
                testPushLoading && styles.buttonDisabled,
              ]}
              onPress={handleSendTestPush}
              disabled={testPushLoading}
              activeOpacity={0.85}
            >
              {testPushLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.notifTestBtnTxt}>{t('adminSendTestPush')}</Text>
              )}
            </TouchableOpacity>
            {testPushMsg ? (
              <Text
                style={[
                  styles.notifTestMsg,
                  { color: testPushMsg === t('adminTestPushSent') ? '#10b981' : '#ef4444' },
                ]}
              >
                {testPushMsg}
              </Text>
            ) : null}
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
  sectionHeaderCompact: {
    fontSize: 26,
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
  securityTitleCompact: {
    fontSize: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoRowAlignTop: {
    alignItems: 'flex-start',
  },
  infoRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  infoRowAction: {
    flexShrink: 0,
    alignSelf: 'center',
  },
  infoRowActionShrink: {
    flexShrink: 0,
  },
  infoRowText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  infoRowTextStacked: {
    flex: 0,
    width: '100%',
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
    minWidth: 0,
  },
  inlineInputFull: {
    width: '100%',
    alignSelf: 'stretch',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  inlineActionsStacked: {
    width: '100%',
    alignSelf: 'stretch',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  buttonOutlineCompact: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonSecondaryFlex: {
    flex: 1,
    minWidth: 0,
  },
  buttonGhostFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  deleteButtonInline: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  deleteButtonInlineCompact: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteButtonInlineText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteWarningIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  deleteWarningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
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
  fieldFeedbackError: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  fieldFeedbackSuccess: {
    color: '#166534',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
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
  notifTestSection: { gap: 12, paddingVertical: 4 },
  notifTestBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  notifTestBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  notifTestMsg: { fontSize: 13, lineHeight: 18 },
  notifTimeRow: { paddingLeft: 60, gap: 8 },
  notifTimeRowCompact: {
    paddingLeft: 0,
    alignItems: 'center',
  },
  notifTimeLabelCompact: {
    width: '100%',
    textAlign: 'center',
  },
  notifAndroidHint: { paddingLeft: 60, paddingRight: 16, gap: 10, marginTop: 4 },
  notifSettingsLink: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  notifSettingsLinkText: { fontSize: 14, fontWeight: '600' },
  srsHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  srsHourRowCompact: {
    marginTop: 0,
    width: '100%',
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
