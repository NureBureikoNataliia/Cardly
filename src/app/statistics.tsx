import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Text } from '@/src/components/Themed';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { supabase } from '@/src/lib/supabase';
import { useAppColors } from '@/src/contexts/ThemeContext';

/* ─── Types ─────────────────────────────────────────────────── */
type Stats = {
  total_reviews: number;
  reviews_today: number;
  streak_days: number;
  cards_new: number;
  cards_learning: number;
  cards_review: number;
  cards_relearning: number;
  total_decks: number;
  count_again: number;
  count_hard: number;
  count_good: number;
  count_easy: number;
};

type WordStats = {
  cards_total: number;
  cards_not_started: number;
  cards_in_progress: number;
  cards_graduated: number;
  ease_easy: number;
  ease_medium: number;
  ease_hard: number;
  words_today: number;
  words_month: number;
  words_alltime: number;
};

type ActivityDay = {
  review_date: string;
  count: number;
};

type DeckStat = {
  deck_id: string;
  deck_title: string;
  cover_image_url: string | null;
  total_cards: number;
  cards_new: number;
  cards_learning: number;
  cards_review: number;
  cards_relearning: number;
  reviews_total: number;
  last_studied: string | null;
};

/* ─── Helpers ────────────────────────────────────────────────── */
function formatDate(iso: string | null, neverLabel: string): string {
  if (!iso) return neverLabel;
  return new Date(iso).toLocaleDateString();
}

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/* ─── InfoTooltip ────────────────────────────────────────────── */
const TIP_W = 230;

type TipAnchor = { top: number; left: number; arrowLeft: number };

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<TipAnchor>({ top: 0, left: 0, arrowLeft: TIP_W / 2 - 6 });
  const btnRef = useRef<View>(null);

  const handlePress = () => {
    if (visible) { setVisible(false); return; }
    (btnRef.current as any)?.measure(
      (_x: number, _y: number, w: number, h: number, pageX: number, pageY: number) => {
        const screenW = Dimensions.get('window').width;
        // центруємо підказку під іконкою, але не виходимо за межі екрану
        let left = pageX + w / 2 - TIP_W / 2;
        left = Math.max(8, Math.min(left, screenW - TIP_W - 8));
        // стрілочка вказує на центр іконки
        const arrowLeft = pageX + w / 2 - left - 6;
        setAnchor({ top: pageY + h + 6, left, arrowLeft });
        setVisible(true);
      },
    );
  };

  return (
    <>
      <Pressable ref={btnRef as any} onPress={handlePress} hitSlop={10} style={styles.infoBtn}>
        <Feather name="info" size={13} color={visible ? '#6366f1' : '#9ca3af'} />
      </Pressable>

      {visible && (
        <Modal transparent animationType="none" onRequestClose={() => setVisible(false)}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)}>
            <View
              style={[styles.tipBubble, { top: anchor.top, left: anchor.left, width: TIP_W }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.tipArrow, { left: anchor.arrowLeft }]} />
              <Text style={styles.tipText}>{text}</Text>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

/* ─── Period card ────────────────────────────────────────────── */
function PeriodCard({
  icon,
  value,
  label,
  color,
  bgColor,
  tip,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  value: number;
  label: string;
  color: string;
  bgColor: string;
  tip: string;
}) {
  const C = useAppColors();
  return (
    <View style={[styles.periodCard, { borderTopColor: color, backgroundColor: C.surface }]}>
      <View style={styles.cardInfoRow}>
        <InfoTooltip text={tip} />
      </View>
      <View style={[styles.periodIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.periodVal, { color }]}>{value}</Text>
      <Text style={styles.periodLabel}>{label}</Text>
    </View>
  );
}

/* ─── Summary card ───────────────────────────────────────────── */
function SummaryCard({
  icon,
  iconBg,
  value,
  label,
  color,
  borderColor,
  tip,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  value: string | number;
  label: string;
  color: string;
  borderColor: string;
  tip: string;
}) {
  const C = useAppColors();
  return (
    <View style={[styles.summaryCard, { borderTopColor: borderColor, backgroundColor: C.surface }]}>
      <View style={styles.cardInfoRow}>
        <InfoTooltip text={tip} />
      </View>
      <View style={[styles.summaryIconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.summaryVal, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

/* ─── Segment bar ────────────────────────────────────────────── */
function SegmentBar({ segments }: { segments: { color: string; value: number }[] }) {
  const C = useAppColors();
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <View style={[styles.segBarBg, { backgroundColor: C.border }]} />;
  return (
    <View style={[styles.segBarBg, { backgroundColor: C.border }]}>
      {segments.map((seg, i) => {
        const w = pct(seg.value, total);
        if (w === 0) return null;
        return (
          <View
            key={i}
            style={[
              styles.segBarFill,
              {
                width: `${w}%`,
                backgroundColor: seg.color,
                borderRadius:
                  i === 0 ? 4 : i === segments.length - 1 ? 4 : 0,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/* ─── Label row ──────────────────────────────────────────────── */
function LabelRow({
  color,
  label,
  count,
  total,
  tip,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
  tip?: string;
}) {
  const C = useAppColors();
  const percent = pct(count, total);
  return (
    <View style={styles.labelRow}>
      <View style={[styles.labelDot, { backgroundColor: color }]} />
      <Text style={[styles.labelText, { color: C.text }]}>{label}</Text>
      <View style={[styles.labelBarBg, { backgroundColor: C.border }]}>
        <View style={[styles.labelBarFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.labelPct, { color }]}>{percent}%</Text>
      <Text style={[styles.labelCount, { color: C.textMuted }]}>{count}</Text>
      {tip && <InfoTooltip text={tip} />}
    </View>
  );
}

/* ─── Activity chart ─────────────────────────────────────────── */
function ActivityChart({ days, t }: { days: ActivityDay[]; t: (k: string) => string }) {
  const C = useAppColors();
  if (days.length === 0) return null;
  const peak = Math.max(1, ...days.map(d => d.count));
  const BAR_MAX_H = 52;

  return (
    <View style={[styles.chartWrap, { backgroundColor: C.surface }]}>
      <View style={styles.chartBars}>
        {days.map(d => {
          const h = Math.max(3, Math.round((d.count / peak) * BAR_MAX_H));
          const isToday = d.review_date === new Date().toISOString().split('T')[0];
          return (
            <View key={d.review_date} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: d.count > 0 ? (isToday ? '#6366f1' : '#a5b4fc') : C.border },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>
          {days[0]?.review_date
            ? new Date(days[0].review_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : ''}
        </Text>
        <Text style={styles.chartLabelCenter}>{t('statActivityDays')}</Text>
        <Text style={styles.chartLabel}>
          {days[days.length - 1]?.review_date
            ? new Date(days[days.length - 1].review_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : ''}
        </Text>
      </View>
    </View>
  );
}

/* ─── Section header ─────────────────────────────────────────── */
function SectionHead({
  icon,
  title,
  pill,
  tip,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  pill?: number;
  tip?: string;
}) {
  const C = useAppColors();
  return (
    <View style={styles.sectionHead}>
      <Feather name={icon} size={16} color="#6366f1" />
      <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
      {pill !== undefined && (
        <View style={styles.totalPill}>
          <Text style={styles.totalPillTxt}>{pill}</Text>
        </View>
      )}
      {tip && <InfoTooltip text={tip} />}
    </View>
  );
}

/* ─── Deck card ──────────────────────────────────────────────── */
function DeckStatCard({ deck, t, onPress }: { deck: DeckStat; t: (k: string) => string; onPress: () => void }) {
  const C = useAppColors();
  const studied = deck.cards_learning + deck.cards_review + deck.cards_relearning;
  const progress = deck.total_cards > 0 ? studied / deck.total_cards : 0;

  return (
    <TouchableOpacity style={[styles.deckCard, { backgroundColor: C.surface }]} onPress={onPress} activeOpacity={0.85}>
      {deck.cover_image_url ? (
        <Image source={{ uri: deck.cover_image_url }} style={styles.deckCover} />
      ) : (
        <View style={[styles.deckCover, styles.deckCoverFallback]}>
          <Feather name="layers" size={22} color="#a5b4fc" />
        </View>
      )}
      <View style={styles.deckInfo}>
        <Text style={[styles.deckTitle, { color: C.text }]} numberOfLines={1}>{deck.deck_title}</Text>
        <Text style={[styles.deckMeta, { color: C.textSub }]}>
          {deck.total_cards} {t('statCards')} · {deck.reviews_total} {t('statReviews')}
        </Text>
        <View style={[styles.progressBg, { backgroundColor: C.border }]}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={[styles.deckLastStudied, { color: C.textMuted }]}>
          {t('statLastStudied')}: {formatDate(deck.last_studied, t('statNever'))}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Screen
═══════════════════════════════════════════════════════════════ */
export default function StatisticsScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const C = useAppColors();

  const [stats, setStats] = useState<Stats | null>(null);
  const [wordStats, setWordStats] = useState<WordStats | null>(null);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [deckStats, setDeckStats] = useState<DeckStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    const [statsRes, wordRes, activityRes, deckRes] = await Promise.all([
      supabase.rpc('get_my_stats'),
      supabase.rpc('get_my_word_stats'),
      supabase.rpc('get_review_activity', { p_days: 30 }),
      supabase.rpc('get_my_deck_stats'),
    ]);
    if (statsRes.error || wordRes.error || activityRes.error || deckRes.error) {
      setError(t('statLoadError'));
    }
    if (statsRes.data?.[0]) setStats(statsRes.data[0] as Stats);
    if (wordRes.data?.[0]) setWordStats(wordRes.data[0] as WordStats);
    setActivity((activityRes.data ?? []) as ActivityDay[]);
    setDeckStats((deckRes.data ?? []) as DeckStat[]);
    setLoading(false);
    setRefreshing(false);
  }, [user, t]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const totalReviews  = stats?.total_reviews ?? 0;
  const countAgain    = stats?.count_again   ?? 0;
  const countHard     = stats?.count_hard    ?? 0;
  const countGood     = stats?.count_good    ?? 0;
  const countEasy     = stats?.count_easy    ?? 0;
  const retentionRate = pct(countGood + countEasy, totalReviews);

  const cardsTotal      = wordStats?.cards_total      ?? 0;
  const cardsNotStarted = wordStats?.cards_not_started ?? 0;
  const cardsInProgress = wordStats?.cards_in_progress ?? 0;
  const cardsGraduated  = wordStats?.cards_graduated   ?? 0;
  const easeEasy        = wordStats?.ease_easy         ?? 0;
  const easeMedium      = wordStats?.ease_medium       ?? 0;
  const easeHard        = wordStats?.ease_hard         ?? 0;
  const easeTotal       = easeEasy + easeMedium + easeHard;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
    >
      {error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color="#dc2626" />
          <Text style={styles.errorTxt}>{error}</Text>
        </View>
      )}

      {/* ══ 1. Вивчені слова ══ */}
      <View style={styles.section}>
        <SectionHead icon="book" title={t('statWordsTitle')} />
        <View style={styles.periodRow}>
          <PeriodCard icon="calendar"  value={wordStats?.words_today   ?? 0} label={t('statWordsToday')}   color="#6366f1" bgColor="#EEF2FF" tip={t('tipWordsToday')} />
          <PeriodCard icon="bar-chart" value={wordStats?.words_month   ?? 0} label={t('statWordsMonth')}   color="#0891b2" bgColor="#e0f2fe" tip={t('tipWordsMonth')} />
          <PeriodCard icon="award"     value={wordStats?.words_alltime ?? 0} label={t('statWordsAllTime')} color="#059669" bgColor="#d1fae5" tip={t('tipWordsAllTime')} />
        </View>
      </View>

      {/* ══ 2. Summary ══ */}
      <View style={styles.summaryGrid}>
        <SummaryCard icon="zap"          iconBg="#fef3c7" value={stats?.streak_days ?? 0}    label={`${t('statStreak')} (${t('statDays')})`} color="#d97706" borderColor="#f59e0b" tip={t('tipStreak')} />
        <SummaryCard icon="trending-up"  iconBg="#fce7f3" value={`${retentionRate}%`}        label={t('statRetention')}                 color="#db2777" borderColor="#db2777" tip={t('tipRetention')} />
      </View>

      {/* ══ 3. Прогрес слів ══ */}
      <View style={styles.section}>
        <SectionHead icon="layers" title={t('statWordProgress')} pill={cardsTotal} tip={t('tipWordProgress')} />
        <View style={[styles.whiteCard, { backgroundColor: C.surface }]}>
          <SegmentBar segments={[
            { color: '#9ca3af', value: cardsNotStarted },
            { color: '#f59e0b', value: cardsInProgress },
            { color: '#10b981', value: cardsGraduated  },
          ]} />
          <View style={styles.segLegend}>
            <LabelRow color="#9ca3af" label={t('statNotStarted')} count={cardsNotStarted} total={cardsTotal} tip={t('tipNotStarted')} />
            <LabelRow color="#f59e0b" label={t('statInProgress')} count={cardsInProgress} total={cardsTotal} tip={t('tipInProgress')} />
            <LabelRow color="#10b981" label={t('statGraduated')}  count={cardsGraduated}  total={cardsTotal} tip={t('tipGraduated')} />
          </View>
          {cardsTotal > 0 && (
            <View style={[styles.retentionRow, { borderTopColor: C.borderLight }]}>
              <Feather name="check-circle" size={13} color="#10b981" />
              <Text style={[styles.retentionTxt, { color: C.textSub }]}>
                {t('statGraduated')}: <Text style={{ fontWeight: '800', color: '#10b981' }}>{pct(cardsGraduated, cardsTotal)}%</Text>
                {' '}({cardsGraduated}/{cardsTotal})
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ══ 4. Складність слів ══ */}
      <View style={styles.section}>
        <SectionHead icon="sliders" title={t('statDifficulty')} tip={t('tipDifficulty')} />
        {easeTotal === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: C.surface }]}><Text style={[styles.emptyTxt, { color: C.textMuted }]}>{t('statNoActivity')}</Text></View>
        ) : (
          <View style={[styles.whiteCard, { backgroundColor: C.surface }]}>
            <SegmentBar segments={[
              { color: '#22c55e', value: easeEasy   },
              { color: '#f59e0b', value: easeMedium },
              { color: '#ef4444', value: easeHard   },
            ]} />
            <View style={styles.segLegend}>
              <LabelRow color="#22c55e" label={t('statDiffEasy')}   count={easeEasy}   total={easeTotal} tip={t('tipDiffEasy')} />
              <LabelRow color="#f59e0b" label={t('statDiffMedium')} count={easeMedium} total={easeTotal} tip={t('tipDiffMedium')} />
              <LabelRow color="#ef4444" label={t('statDiffHard')}   count={easeHard}   total={easeTotal} tip={t('tipDiffHard')} />
            </View>
          </View>
        )}
      </View>

      {/* ══ 5. Активність ══ */}
      <View style={styles.section}>
        <SectionHead icon="activity" title={t('statActivity')} tip={t('tipActivity')} />
        {activity.every(d => d.count === 0) ? (
          <View style={[styles.emptyBox, { backgroundColor: C.surface }]}><Text style={[styles.emptyTxt, { color: C.textMuted }]}>{t('statNoActivity')}</Text></View>
        ) : (
          <ActivityChart days={activity} t={t} />
        )}
      </View>

      {/* ══ 6. Розподіл відповідей ══ */}
      <View style={styles.section}>
        <SectionHead icon="bar-chart-2" title={t('statAnswers')} pill={totalReviews > 0 ? totalReviews : undefined} tip={t('tipAnswers')} />
        {totalReviews === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: C.surface }]}><Text style={[styles.emptyTxt, { color: C.textMuted }]}>{t('statNoActivity')}</Text></View>
        ) : (
          <View style={[styles.whiteCard, { backgroundColor: C.surface }]}>
            <LabelRow label={t('again')} count={countAgain} total={totalReviews} color="#ef4444" />
            <LabelRow label={t('hard')}  count={countHard}  total={totalReviews} color="#f59e0b" />
            <LabelRow label={t('good')}  count={countGood}  total={totalReviews} color="#22c55e" />
            <LabelRow label={t('easy')}  count={countEasy}  total={totalReviews} color="#3b82f6" />
            <View style={[styles.retentionRow, { borderTopColor: C.borderLight }]}>
              <Feather name="check-circle" size={13} color="#22c55e" />
              <Text style={[styles.retentionTxt, { color: C.textSub }]}>
                {t('statRetention')}: <Text style={styles.retentionVal}>{retentionRate}%</Text>
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ══ 7. Мої дошки ══ */}
      <View style={styles.section}>
        <SectionHead icon="grid" title={t('statDecks')} />
        {deckStats.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: C.surface }]}><Text style={[styles.emptyTxt, { color: C.textMuted }]}>{t('statNoDecks')}</Text></View>
        ) : (
          deckStats.map(d => (
            <DeckStatCard key={d.deck_id} deck={d} t={t} onPress={() => router.push(`/deck-detail?id=${d.deck_id}`)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: '#f5f6fa' },
  content:  {
    padding: 16, paddingBottom: 48, gap: 16,
    maxWidth: 1104, width: '100%', alignSelf: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#fecaca',
  },
  errorTxt: { fontSize: 13, color: '#dc2626', flex: 1 },

  /* ── Tooltip bubble ── */
  infoBtn: { padding: 2 },
  tipBubble: {
    position: 'absolute',
    maxWidth: 240,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 9999,
  },
  tipArrow: {
    position: 'absolute',
    top: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1f2937',
  },
  tipText: { color: '#f9fafb', fontSize: 12, lineHeight: 17 },

  /* ── Info row inside cards ── */
  cardInfoRow: { width: '100%', alignItems: 'flex-end', minHeight: 18 },

  /* ── Period cards ── */
  periodRow: { flexDirection: 'row', gap: 10 },
  periodCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  periodIcon: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  periodVal:   { fontSize: 22, fontWeight: '800' },
  periodLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500', textAlign: 'center' },

  /* ── Summary 2×2 ── */
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    width: '47%', flexGrow: 1,
    backgroundColor: '#fff', borderRadius: 14, padding: 10,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  summaryIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  summaryVal:   { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center', fontWeight: '500' },

  /* ── Sections ── */
  section:      { gap: 10 },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  totalPill: {
    backgroundColor: '#EEF2FF', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  totalPillTxt: { fontSize: 12, fontWeight: '700', color: '#6366f1' },

  /* ── White card ── */
  whiteCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  /* ── Segment bar ── */
  segBarBg:   { height: 10, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden', flexDirection: 'row' },
  segBarFill: { height: 10 },
  segLegend:  { gap: 10 },

  /* ── Label row ── */
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelDot:    { width: 10, height: 10, borderRadius: 5 },
  labelText:   { width: 80, fontSize: 13, fontWeight: '600' },
  labelBarBg:  { flex: 1, height: 7, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  labelBarFill:{ height: 7, borderRadius: 4 },
  labelPct:    { width: 34, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  labelCount:  { width: 36, fontSize: 11, color: '#9ca3af', textAlign: 'right' },

  /* ── Retention row ── */
  retentionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  retentionTxt: { fontSize: 13, color: '#6b7280' },
  retentionVal: { fontWeight: '800', color: '#22c55e' },

  /* ── Activity chart ── */
  chartWrap: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  chartBars:       { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 2 },
  barCol:          { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar:             { width: '100%', borderRadius: 3 },
  chartLabels:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  chartLabel:      { fontSize: 10, color: '#9ca3af' },
  chartLabelCenter:{ fontSize: 10, color: '#9ca3af', textAlign: 'center' },

  /* ── Deck cards ── */
  deckCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  deckCover:        { width: 60, height: 60, borderRadius: 10 },
  deckCoverFallback:{ backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  deckInfo:         { flex: 1, gap: 4 },
  deckTitle:        { fontSize: 14, fontWeight: '700' },
  deckMeta:         { fontSize: 12, color: '#6b7280' },
  progressBg:       { height: 5, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: 5, backgroundColor: '#6366f1', borderRadius: 3 },
  deckLastStudied:  { fontSize: 11, color: '#9ca3af' },

  /* ── Empty ── */
  emptyBox: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyTxt: { fontSize: 14, color: '#9ca3af' },
});
