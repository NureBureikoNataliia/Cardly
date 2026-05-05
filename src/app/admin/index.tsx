import Feather from '@expo/vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Text } from '@/src/components/Themed';
import ConfirmModal from '@/src/components/ConfirmModal';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { supabase } from '@/src/lib/supabase';

/* ─── Types ─── */
type Stats = {
  total_users: number;
  total_decks: number;
  total_cards: number;
  total_complaints: number;
  total_comments: number;
};

type Complaint = {
  id: string;
  created_at: string;
  issue_key: string;
  details: string | null;
  gemini_summary: string | null;
  deck_id: string;
  deck_title: string;
  reporter_id: string;
  reporter_name: string;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  deck_id: string;
  username: string;
  deck_title: string;
};

type AdminUser = {
  user_id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  registration_date: string;
  is_admin: boolean;
  deck_count: number;
  last_sign_in: string | null;
};

type Tab = 'overview' | 'complaints' | 'comments' | 'users';

/* ═══════════════════════════════════════ */
export default function AdminPanelScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Confirm modals
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [complaintToDismiss, setComplaintToDismiss] = useState<Complaint | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<Complaint | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('adminPanel') });
  }, [navigation, t]);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (!isAdmin) router.replace('/(tabs)');
  }, [authLoading, user, isAdmin, router]);

  /* ── Load data ── */
  const load = useCallback(async () => {
    if (!isAdmin) return;
    const [statsRes, complRes, commRes, usersRes] = await Promise.all([
      supabase.rpc('admin_get_stats'),
      supabase.rpc('admin_get_all_complaints'),
      supabase.rpc('admin_get_all_comments'),
      supabase.rpc('admin_get_all_users'),
    ]);
    if (__DEV__) {
      if (statsRes.error)  console.warn('[admin] stats error',      statsRes.error);
      if (complRes.error)  console.warn('[admin] complaints error', complRes.error);
      if (commRes.error)   console.warn('[admin] comments error',   commRes.error);
      if (usersRes.error)  console.warn('[admin] users error',      usersRes.error);
    }
    if (statsRes.data?.[0]) setStats(statsRes.data[0] as Stats);
    setComplaints((complRes.data ?? []) as Complaint[]);
    setComments((commRes.data ?? []) as Comment[]);
    setUsers((usersRes.data ?? []) as AdminUser[]);
    setLoading(false);
    setRefreshing(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading && isAdmin) { setLoading(true); load(); }
  }, [authLoading, isAdmin, load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  /* ── Actions ── */
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    const { error } = await supabase.rpc('admin_delete_comment', { p_id: commentToDelete.id });
    if (error) { console.warn('[admin] delete comment error', error); return; }
    setComments(prev => prev.filter(c => c.id !== commentToDelete.id));
    setCommentToDelete(null);
  };

  const handleDismissComplaint = async () => {
    if (!complaintToDismiss) return;
    const { error } = await supabase.rpc('admin_dismiss_complaint', { p_id: complaintToDismiss.id });
    if (error) { console.warn('[admin] dismiss complaint error', error); return; }
    setComplaints(prev => prev.filter(c => c.id !== complaintToDismiss.id));
    setComplaintToDismiss(null);
  };

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;
    const { error } = await supabase.rpc('admin_delete_deck', { p_deck_id: deckToDelete.deck_id });
    if (error) { console.warn('[admin] delete deck error', error); return; }
    setComplaints(prev => prev.filter(c => c.deck_id !== deckToDelete.deck_id));
    setDeckToDelete(null);
  };

  const handleToggleAdmin = async (u: AdminUser) => {
    const { error } = await supabase.rpc('admin_set_admin', {
      p_user_id: u.user_id,
      p_is_admin: !u.is_admin,
    });
    if (error) { console.warn('[admin] toggle admin error', error); return; }
    setUsers(prev => prev.map(x => x.user_id === u.user_id ? { ...x, is_admin: !u.is_admin } : x));
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userToDelete.user_id });
    if (error) { console.warn('[admin] delete user error', error); return; }
    setUsers(prev => prev.filter(x => x.user_id !== userToDelete.user_id));
    setUserToDelete(null);
  };

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  /* ── Tab definitions ── */
  const TABS: { key: Tab; icon: keyof typeof Feather.glyphMap; label: string; count?: number }[] = [
    { key: 'overview',   icon: 'bar-chart-2',    label: t('adminTabOverview') },
    { key: 'users',      icon: 'users',           label: t('adminTabUsers'),      count: users.length },
    { key: 'complaints', icon: 'alert-triangle',  label: t('adminTabComplaints'), count: complaints.length },
    { key: 'comments',   icon: 'message-square',  label: t('adminTabComments'),   count: comments.length },
  ];

  /* ──────────────────────────── RENDER ──────────────────────────── */
  return (
    <View style={styles.shell}>
      {/* ── Left sidebar (tabs) ── */}
      <View style={styles.sidebar}>
        {/* Header */}
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarIconWrap}>
            <Feather name="shield" size={18} color="#6366f1" />
          </View>
          <Text style={styles.sidebarTitle}>{t('adminPanel')}</Text>
        </View>

        {/* Nav */}
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.navItem, activeTab === tab.key && styles.navItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Feather
              name={tab.icon}
              size={17}
              color={activeTab === tab.key ? '#6366f1' : '#6b7280'}
            />
            <Text style={[styles.navLabel, activeTab === tab.key && styles.navLabelActive]}>
              {tab.label}
            </Text>
            {(tab.count ?? 0) > 0 && (
              <View style={[styles.navBadge, activeTab === tab.key && styles.navBadgeActive]}>
                <Text style={[styles.navBadgeTxt, activeTab === tab.key && styles.navBadgeTxtActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Footer */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)')}>
          <Feather name="arrow-left" size={15} color="#6b7280" />
          <Text style={styles.backBtnTxt}>{t('adminBackToApp')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Main content ── */}
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#6366f1" size="large" />
          </View>
        ) : (
          <>
            {/* ════ OVERVIEW ════ */}
            {activeTab === 'overview' && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Feather name="bar-chart-2" size={18} color="#6366f1" />
                  <Text style={styles.sectionTitle}>{t('adminTabOverview')}</Text>
                </View>
                <View style={styles.statsGrid}>
                  <StatCard icon="users"          color="#6366f1" value={stats?.total_users     ?? 0} label={t('adminStatUsers')} />
                  <StatCard icon="layers"         color="#10b981" value={stats?.total_decks     ?? 0} label={t('adminStatDecks')} />
                  <StatCard icon="credit-card"    color="#f59e0b" value={stats?.total_cards     ?? 0} label={t('adminStatCards')} />
                  <StatCard icon="alert-triangle" color="#ef4444" value={stats?.total_complaints ?? 0} label={t('adminStatComplaints')} />
                  <StatCard icon="message-square" color="#8b5cf6" value={stats?.total_comments  ?? 0} label={t('adminStatComments')} />
                </View>
              </View>
            )}

            {/* ════ USERS ════ */}
            {activeTab === 'users' && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Feather name="users" size={18} color="#6366f1" />
                  <Text style={styles.sectionTitle}>{t('adminTabUsers')}</Text>
                  <View style={[styles.countPill, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={[styles.countPillTxt, { color: '#6366f1' }]}>{users.length}</Text>
                  </View>
                </View>

                {/* Search */}
                <View style={styles.searchWrap}>
                  <Feather name="search" size={15} color="#9ca3af" style={{ marginLeft: 10 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t('adminSearchUsers')}
                    placeholderTextColor="#9ca3af"
                    value={userSearch}
                    onChangeText={setUserSearch}
                  />
                  {userSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setUserSearch('')} style={{ marginRight: 10 }}>
                      <Feather name="x" size={15} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>

                {filteredUsers.length === 0 ? (
                  <EmptyState icon="users" text={t('adminNoUsers')} />
                ) : (
                  filteredUsers.map(u => (
                    <View key={u.user_id} style={styles.userCard}>
                      {/* Avatar + info */}
                      <View style={styles.userCardLeft}>
                        <View style={[styles.userAvatar, u.is_admin && styles.userAvatarAdmin]}>
                          <Text style={[styles.userAvatarTxt, u.is_admin && { color: '#6366f1' }]}>
                            {u.username[0]?.toUpperCase() ?? '?'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.userNameRow}>
                            <Text style={styles.userName}>{u.username}</Text>
                            {u.is_admin && (
                              <View style={styles.adminBadge}>
                                <Feather name="shield" size={10} color="#6366f1" />
                                <Text style={styles.adminBadgeTxt}>{t('adminAdminBadge')}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.userEmail}>{u.email}</Text>
                          <View style={styles.userMeta}>
                            <View style={styles.userMetaItem}>
                              <Feather name="layers" size={11} color="#9ca3af" />
                              <Text style={styles.userMetaTxt}>{u.deck_count} {t('adminUserDecks')}</Text>
                            </View>
                            <View style={styles.userMetaItem}>
                              <Feather name="clock" size={11} color="#9ca3af" />
                              <Text style={styles.userMetaTxt}>
                                {u.last_sign_in
                                  ? new Date(u.last_sign_in).toLocaleDateString()
                                  : t('adminUserNever')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={styles.userActions}>
                        <TouchableOpacity
                          style={[styles.userBtn, u.is_admin ? styles.userBtnWarning : styles.userBtnPrimary]}
                          onPress={() => handleToggleAdmin(u)}
                          activeOpacity={0.8}
                        >
                          <Feather name="shield" size={13} color={u.is_admin ? '#d97706' : '#6366f1'} />
                          <Text style={[styles.userBtnTxt, { color: u.is_admin ? '#d97706' : '#6366f1' }]}>
                            {u.is_admin ? t('adminRemoveAdmin') : t('adminMakeAdmin')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.userBtnDanger}
                          onPress={() => setUserToDelete(u)}
                          activeOpacity={0.8}
                        >
                          <Feather name="trash-2" size={13} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ════ COMPLAINTS ════ */}
            {activeTab === 'complaints' && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Feather name="alert-triangle" size={18} color="#ef4444" />
                  <Text style={styles.sectionTitle}>{t('adminTabComplaints')}</Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countPillTxt}>{complaints.length}</Text>
                  </View>
                </View>

                {complaints.length === 0 ? (
                  <EmptyState icon="check-circle" text={t('adminNoComplaints')} />
                ) : (
                  complaints.map(row => (
                    <View key={row.id} style={styles.card}>
                      {/* Card header */}
                      <View style={styles.cardHead}>
                        <View style={styles.issueBadge}>
                          <Text style={styles.issueTxt}>{row.issue_key}</Text>
                        </View>
                        <Text style={styles.cardDate}>
                          {new Date(row.created_at).toLocaleDateString()}
                        </Text>
                      </View>

                      {/* Deck */}
                      <Pressable
                        style={styles.deckRow}
                        onPress={() => router.push(`/deck-detail?id=${row.deck_id}`)}
                      >
                        <Feather name="layers" size={13} color="#6366f1" />
                        <Text style={styles.deckTitle} numberOfLines={1}>{row.deck_title}</Text>
                        <Feather name="external-link" size={12} color="#6366f1" />
                      </Pressable>

                      {/* Reporter */}
                      <Text style={styles.metaTxt}>
                        {t('adminReporter')}: <Text style={styles.metaBold}>{row.reporter_name}</Text>
                      </Text>

                      {/* Details */}
                      {row.details ? (
                        <Text style={styles.bodyTxt}>{row.details}</Text>
                      ) : null}

                      {/* AI summary */}
                      {row.gemini_summary ? (
                        <View style={styles.aiBox}>
                          <Feather name="cpu" size={12} color="#6366f1" />
                          <Text style={styles.aiLabel}>{t('adminGeminiSummary')}</Text>
                          <Text style={styles.aiTxt}>{row.gemini_summary}</Text>
                        </View>
                      ) : null}

                      {/* Actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.btnDismiss}
                          onPress={() => setComplaintToDismiss(row)}
                          activeOpacity={0.8}
                        >
                          <Feather name="check" size={14} color="#059669" />
                          <Text style={styles.btnDismissTxt}>{t('adminDismissComplaint')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.btnDanger}
                          onPress={() => setDeckToDelete(row)}
                          activeOpacity={0.8}
                        >
                          <Feather name="trash-2" size={14} color="#fff" />
                          <Text style={styles.btnDangerTxt}>{t('adminDeleteDeck')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ════ COMMENTS ════ */}
            {activeTab === 'comments' && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Feather name="message-square" size={18} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>{t('adminTabComments')}</Text>
                  <View style={[styles.countPill, { backgroundColor: '#f3e8ff' }]}>
                    <Text style={[styles.countPillTxt, { color: '#8b5cf6' }]}>{comments.length}</Text>
                  </View>
                </View>

                {comments.length === 0 ? (
                  <EmptyState icon="message-circle" text={t('adminNoComments')} />
                ) : (
                  comments.map(row => (
                    <View key={row.id} style={styles.card}>
                      <View style={styles.commentHead}>
                        {/* Avatar */}
                        <View style={styles.avatar}>
                          <Text style={styles.avatarTxt}>{row.username[0]?.toUpperCase() ?? '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.commentUser}>{row.username}</Text>
                          <Pressable
                            style={styles.commentDeckRow}
                            onPress={() => router.push(`/deck-detail?id=${row.deck_id}`)}
                          >
                            <Feather name="layers" size={11} color="#6366f1" />
                            <Text style={styles.commentDeckTxt} numberOfLines={1}>{row.deck_title}</Text>
                          </Pressable>
                        </View>
                        <Text style={styles.cardDate}>
                          {new Date(row.created_at).toLocaleDateString()}
                        </Text>
                      </View>

                      <Text style={styles.commentContent}>{row.content}</Text>

                      <TouchableOpacity
                        style={styles.btnDeleteComment}
                        onPress={() => setCommentToDelete(row)}
                        activeOpacity={0.8}
                      >
                        <Feather name="trash-2" size={13} color="#dc2626" />
                        <Text style={styles.btnDeleteCommentTxt}>{t('adminDeleteComment')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Confirm modals ── */}
      <ConfirmModal
        visible={Boolean(commentToDelete)}
        title={t('adminDeleteComment')}
        message={t('adminDeleteCommentConfirm')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        destructive
        icon="trash-2"
        onConfirm={handleDeleteComment}
        onCancel={() => setCommentToDelete(null)}
      />
      <ConfirmModal
        visible={Boolean(complaintToDismiss)}
        title={t('adminDismissComplaint')}
        message={`Close complaint about "${complaintToDismiss?.deck_title}"?`}
        confirmText={t('adminDismissComplaint')}
        cancelText={t('cancel')}
        icon="check-circle"
        onConfirm={handleDismissComplaint}
        onCancel={() => setComplaintToDismiss(null)}
      />
      <ConfirmModal
        visible={Boolean(deckToDelete)}
        title={t('adminDeleteDeck')}
        message={t('adminDeleteDeckConfirm')}
        confirmText={t('adminDeleteDeck')}
        cancelText={t('cancel')}
        destructive
        icon="trash-2"
        onConfirm={handleDeleteDeck}
        onCancel={() => setDeckToDelete(null)}
      />
      <ConfirmModal
        visible={Boolean(userToDelete)}
        title={t('adminDeleteUser')}
        message={t('adminDeleteUserConfirm')}
        confirmText={t('adminDeleteUser')}
        cancelText={t('cancel')}
        destructive
        icon="trash-2"
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </View>
  );
}

/* ─── Sub-components ─── */
function StatCard({ icon, color, value, label }: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statVal, { color }]}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={32} color="#d1d5db" />
      </View>
      <Text style={styles.emptyTxt}>{text}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════ STYLES ═══════════════════════════════════════ */
const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f6fa',
  },

  /* ── Sidebar ── */
  sidebar: {
    width: Platform.OS === 'web' ? 220 : 64,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#f0f1f5',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 10,
    gap: 4,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f5',
  },
  sidebarIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: 14, fontWeight: '700', color: '#111827',
    display: Platform.OS === 'web' ? 'flex' : 'none' as any,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10,
  },
  navItemActive: { backgroundColor: '#EEF2FF' },
  navLabel: {
    flex: 1, fontSize: 14, fontWeight: '500', color: '#6b7280',
    display: Platform.OS === 'web' ? 'flex' : 'none' as any,
  },
  navLabelActive: { color: '#6366f1', fontWeight: '700' },
  navBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  navBadgeActive: { backgroundColor: '#6366f1' },
  navBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  navBadgeTxtActive: { color: '#fff' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 'auto' as any, paddingHorizontal: 10, paddingVertical: 10,
  },
  backBtnTxt: {
    fontSize: 13, color: '#6b7280',
    display: Platform.OS === 'web' ? 'flex' : 'none' as any,
  },

  /* ── Main ── */
  main: { flex: 1 },
  mainContent: { padding: 20, paddingBottom: 60, gap: 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  section: { gap: 12 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 },
  countPill: {
    backgroundColor: '#fef2f2', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countPillTxt: { fontSize: 12, fontWeight: '700', color: '#ef4444' },

  /* ── Stats ── */
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  statCard: {
    flex: 1, minWidth: 140,
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, gap: 8,
    borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start',
  },
  statVal: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  /* ── Cards ── */
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { fontSize: 12, color: '#9ca3af' },

  issueBadge: {
    backgroundColor: '#fef9ec', borderWidth: 1, borderColor: '#fcd34d',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  issueTxt: { fontSize: 12, fontWeight: '700', color: '#92400e' },

  deckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  deckTitle: { fontSize: 13, fontWeight: '600', color: '#6366f1', maxWidth: 280 },

  metaTxt: { fontSize: 13, color: '#6b7280' },
  metaBold: { fontWeight: '600', color: '#374151' },
  bodyTxt: { fontSize: 14, color: '#374151', lineHeight: 20 },

  aiBox: {
    backgroundColor: '#f8faff', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#6366f1', gap: 4,
  },
  aiLabel: { fontSize: 11, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' },
  aiTxt: { fontSize: 13, color: '#475569', lineHeight: 18 },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4, justifyContent: 'flex-end' },
  btnDismiss: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
  },
  btnDismissTxt: { fontSize: 12, fontWeight: '600', color: '#059669' },
  btnDanger: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
  },
  btnDangerTxt: { fontSize: 12, fontWeight: '600', color: '#fff' },

  /* ── Comments ── */
  commentHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarTxt: { fontSize: 15, fontWeight: '700', color: '#6366f1' },
  commentUser: { fontSize: 14, fontWeight: '700', color: '#111827' },
  commentDeckRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  commentDeckTxt: { fontSize: 12, color: '#6366f1', maxWidth: 200 },
  commentContent: { fontSize: 15, color: '#374151', lineHeight: 22 },
  btnDeleteComment: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#fef2f2', borderRadius: 8,
    borderWidth: 1, borderColor: '#fecaca',
  },
  btnDeleteCommentTxt: { fontSize: 13, fontWeight: '600', color: '#dc2626' },

  /* ── Search ── */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f9fafb', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: '#111827',
    outlineWidth: 0, outlineStyle: 'none',
    backgroundColor: 'transparent',
  } as any,

  /* ── Users ── */
  userCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  userCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  userAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#e5e7eb',
  },
  userAvatarAdmin: { borderColor: '#c7d2fe', backgroundColor: '#EEF2FF' },
  userAvatarTxt: { fontSize: 16, fontWeight: '700', color: '#374151' },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EEF2FF', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  adminBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#6366f1' },
  userEmail: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  userMeta: { flexDirection: 'row', gap: 12, marginTop: 5, flexWrap: 'wrap' },
  userMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userMetaTxt: { fontSize: 12, color: '#9ca3af' },
  userActions: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  userBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10,
    borderWidth: 1,
  },
  userBtnPrimary: { backgroundColor: '#EEF2FF', borderColor: '#c7d2fe' },
  userBtnWarning: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  userBtnTxt: { fontSize: 12, fontWeight: '600' },
  userBtnDanger: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    justifyContent: 'center', alignItems: 'center',
  },

  /* ── Empty ── */
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center',
  },
  emptyTxt: { fontSize: 15, color: '#9ca3af' },
});
