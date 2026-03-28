import Feather from '@expo/vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/src/components/Themed';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { supabase } from '@/src/lib/supabase';

type ComplaintRow = {
  id: string;
  created_at: string;
  issue_key: string;
  details: string | null;
  gemini_summary: string | null;
  deck_id: string;
  reporter_id: string;
  decks: { title: string } | { title: string }[] | null;
};

export default function AdminPanelScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [stats, setStats] = useState<{ complaints: number; decks: number; users: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('adminPanel') });
  }, [navigation, t]);

  const guard = useCallback(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (!isAdmin) {
      router.replace('/(tabs)');
    }
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    guard();
  }, [guard]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setError(null);
    const [complRes, deckCountRes, userCountRes] = await Promise.all([
      supabase
        .from('deck_complaints')
        .select('id, created_at, issue_key, details, gemini_summary, deck_id, reporter_id, decks(title)')
        .order('created_at', { ascending: false }),
      supabase.from('decks').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
    ]);

    if (complRes.error) {
      setError(complRes.error.message);
      setComplaints([]);
    } else {
      setComplaints((complRes.data ?? []) as ComplaintRow[]);
    }
    setStats({
      complaints: complRes.data?.length ?? 0,
      decks: deckCountRes.count ?? 0,
      users: userCountRes.count ?? 0,
    });
    setLoading(false);
    setRefreshing(false);
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    setLoading(true);
    load();
  }, [authLoading, isAdmin, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4255ff" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4255ff" />
      </View>
    );
  }

  function deckTitle(row: ComplaintRow): string {
    const d = row.decks;
    if (Array.isArray(d)) {
      return d[0]?.title ?? row.deck_id.slice(0, 8);
    }
    return d?.title ?? row.deck_id.slice(0, 8);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.h1}>{t('adminPanel')}</Text>
        <Pressable onPress={() => router.push('/(tabs)')} style={styles.backApp}>
          <Feather name="home" size={18} color="#4255ff" />
          <Text style={styles.backAppText}>{t('adminBackToApp')}</Text>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={styles.blockPad}>
          <ActivityIndicator color="#4255ff" />
        </View>
      ) : null}

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>{t('adminOverview')}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats?.complaints ?? '—'}</Text>
          <Text style={styles.statLabel}>{t('adminStatComplaints')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats?.decks ?? '—'}</Text>
          <Text style={styles.statLabel}>{t('adminStatDecks')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats?.users ?? '—'}</Text>
          <Text style={styles.statLabel}>{t('adminStatUsers')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('adminComplaints')}</Text>
      {complaints.length === 0 && !loading ? (
        <Text style={styles.empty}>{t('adminNoComplaints')}</Text>
      ) : (
        complaints.map((row) => (
          <View key={row.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.issueBadge}>{row.issue_key}</Text>
              <Text style={styles.date}>{new Date(row.created_at).toLocaleString()}</Text>
            </View>
            <Text style={styles.deckLine}>
              {t('adminDeck')}: {deckTitle(row)}
            </Text>
            <Text style={styles.meta}>
              {t('adminReporter')}: {row.reporter_id.slice(0, 8)}…
            </Text>
            {row.details ? (
              <Text style={styles.bodyText}>{row.details}</Text>
            ) : null}
            {row.gemini_summary ? (
              <View style={styles.aiBox}>
                <Text style={styles.aiLabel}>{t('adminGeminiSummary')}</Text>
                <Text style={styles.aiText}>{row.gemini_summary}</Text>
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f7fb',
  },
  pageHeader: {
    marginBottom: 20,
    gap: 10,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  backApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backAppText: {
    fontSize: 15,
    color: '#4255ff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4255ff',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8eaee',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  issueBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  deckLine: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  aiBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4255ff',
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255ff',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  aiText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  empty: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  err: {
    color: '#dc2626',
    marginBottom: 12,
  },
  blockPad: {
    paddingVertical: 16,
  },
});
