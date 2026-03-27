import { Deck } from "@/assets/data/decks";
import { Card } from "@/assets/data/cards";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/contexts/AuthContext";
import { fetchUserProgressForDeck, getDueTodayCountForUser } from "@/src/lib/userCardProgress";
import ConfirmModal from "@/src/components/ConfirmModal";
import { useLanguage } from "@/src/contexts/LanguageContext";

const scrollPositions: Record<string, number> = {};

export default function DeckDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const deckId = typeof params.id === "string" ? params.id : null;
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();

  const { user } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [progressMap, setProgressMap] = useState<
    Map<string, import("@/src/lib/userCardProgress").UserCardProgress>
  >(new Map());
  const [totalCards, setTotalCards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [hasCopy, setHasCopy] = useState<boolean | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    if (!deckId) { setError(t("deckNotFound")); setLoading(false); return; }
    setLoading(true); setError(null);

    const [{ data: deckData, error: deckError }, { data: cardsData, error: cardsError }] =
      await Promise.all([
        supabase.from("decks").select("*").eq("deck_id", deckId).single(),
        supabase.from("cards").select("*").eq("deck_id", deckId).order("created_at", { ascending: false }),
      ]);

    if (deckError || cardsError) {
      setError(t("failedToLoadDeck"));
    } else {
      setDeck(deckData as Deck);
      const list = (cardsData as Card[]) ?? [];
      setCards(list);
      setTotalCards(list.length);
      if (user?.id) {
        const progress = await fetchUserProgressForDeck(user.id, list.map((c) => c.card_id));
        setProgressMap(progress);
      }
    }
    setLoading(false);
  }, [deckId, t, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData().then(() => {
        if (deckId && scrollPositions[deckId] > 0) {
          const y = scrollPositions[deckId];
          let attempts = 0;
          const attemptScroll = () => {
            if (scrollViewRef.current) scrollViewRef.current.scrollTo({ y, animated: false });
            else if (attempts < 20) { attempts++; setTimeout(attemptScroll, 50); }
          };
          setTimeout(attemptScroll, 150);
        }
      });
    }, [loadData, deckId])
  );

  const dueToday = user
    ? getDueTodayCountForUser(cards.map((c) => c.card_id), progressMap)
    : totalCards;

  const isOwner = deck && user && deck.creator_id === user.id;
  const isPublicFromOther = !isOwner && deck?.is_public;

  const checkHasCopy = useCallback(async () => {
    if (!deck || !user || isOwner) return;
    const { data } = await supabase
      .from("decks").select("deck_id")
      .eq("creator_id", user.id).eq("original_deck_id", deck.deck_id).limit(1);
    setHasCopy((data?.length ?? 0) > 0);
  }, [deck, user, isOwner]);

  useEffect(() => { if (isPublicFromOther) checkHasCopy(); }, [isPublicFromOther, checkHasCopy]);

  const handleAddToMyAccount = async () => {
    if (!deck || !user || isCopying || hasCopy) return;
    setIsCopying(true); setError(null);
    try {
      const { data: newDeck, error: deckErr } = await supabase.from("decks").insert({
        creator_id: user.id, title: deck.title, description: deck.description,
        cover_image_url: deck.cover_image_url, is_public: false, original_deck_id: deck.deck_id,
      }).select("deck_id").single();
      if (deckErr) { setErrorModal(deckErr.message ?? t("failedToLoadData")); setIsCopying(false); return; }
      if (cards.length > 0) {
        const { error: cardsErr } = await supabase.from("cards").insert(
          cards.map((c) => ({ deck_id: newDeck.deck_id, card_type: c.card_type ?? "basic",
            front_text: c.front_text, back_text: c.back_text,
            front_media_url: c.front_media_url, back_media_url: c.back_media_url, notes: c.notes }))
        );
        if (cardsErr) { setErrorModal(cardsErr.message ?? t("failedToLoadData")); setIsCopying(false); return; }
      }
      setHasCopy(true);
      router.replace(`/deck-detail?id=${newDeck.deck_id}`);
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : t("unexpectedError"));
    } finally { setIsCopying(false); }
  };

  const handleUpdateFromOriginal = async () => {
    if (!deck || !deck.original_deck_id || isUpdating) return;
    setIsUpdating(true); setError(null);
    try {
      const { data: originalCards, error: fetchErr } = await supabase.from("cards")
        .select("front_text, back_text, notes, card_type, front_media_url, back_media_url")
        .eq("deck_id", deck.original_deck_id);
      if (fetchErr) { setErrorModal(fetchErr.message ?? t("failedToLoadData")); setIsUpdating(false); return; }
      const existingKeys = new Set(cards.map((c) => `${c.front_text}\0${c.back_text}`));
      const toAdd = (originalCards ?? []).filter((oc) => !existingKeys.has(`${oc.front_text}\0${oc.back_text}`));
      if (toAdd.length === 0) { setErrorModal(t("noNewCards")); setIsUpdating(false); return; }
      const { error: insertErr } = await supabase.from("cards").insert(
        toAdd.map((c) => ({ deck_id: deck.deck_id, card_type: c.card_type ?? "basic",
          front_text: c.front_text, back_text: c.back_text,
          front_media_url: c.front_media_url, back_media_url: c.back_media_url, notes: c.notes }))
      );
      if (insertErr) { setErrorModal(insertErr.message ?? t("failedToLoadData")); setIsUpdating(false); return; }
      await loadData();
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : t("unexpectedError"));
    } finally { setIsUpdating(false); }
  };

  const handleDeleteCard = (card: Card) => setCardToDelete(card);

  const performDeleteCard = async () => {
    if (!cardToDelete) return;
    const card = cardToDelete;
    setCardToDelete(null);
    const { error } = await supabase.from("cards").delete().eq("card_id", card.card_id);
    if (error) { setErrorModal(error.message || t("failedToDeleteCard")); return; }
    setCards((prev) => prev.filter((c) => c.card_id !== card.card_id));
    setTotalCards((prev) => Math.max(0, prev - 1));
  };

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("appName") });
    return () => { navigation.setOptions({ headerShown: undefined, tabBarStyle: undefined }); };
  }, [navigation, t]);

  const isCopiedDeck = Boolean(deck?.original_deck_id);

  /* ── responsive grid: 2 cols on wide, 1 on narrow ── */
  const numCols = Platform.OS === "web" && windowWidth >= 860 ? 2 : 1;

  /* ── loading ── */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error || !deck) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={40} color="#d1d5db" />
        <Text style={styles.errorMsg}>{error ?? t("deckNotFound")}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnTxt}>{t("goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── progress % ── */
  const progressPct = totalCards > 0 ? Math.round(((totalCards - dueToday) / totalCards) * 100) : 0;

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={styles.root}
        contentContainerStyle={styles.contentOuter}
        onScroll={(e) => { if (deckId) scrollPositions[deckId] = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageWrap}>

          {/* ════════════ HERO ════════════ */}
          <View style={styles.hero}>
            {deck.cover_image_url ? (
              <>
                <Image source={{ uri: deck.cover_image_url }} style={styles.heroImage} resizeMode="cover" />
                <View style={styles.heroOverlay} />
              </>
            ) : (
              <View style={styles.heroGradient} />
            )}

            {/* Badge row */}
            <View style={styles.heroBadgeRow}>
              <View style={[styles.badge, deck.is_public ? styles.badgePublic : styles.badgePrivate]}>
                <Feather name={deck.is_public ? "globe" : "lock"} size={11} color={deck.is_public ? "#059669" : "#9ca3af"} />
                <Text style={[styles.badgeTxt, deck.is_public ? styles.badgeTxtPublic : styles.badgeTxtPrivate]}>
                  {deck.is_public ? t("public") : t("private")}
                </Text>
              </View>
              {isCopiedDeck && (
                <View style={styles.badgeCopy}>
                  <Feather name="copy" size={11} color="#8b5cf6" />
                  <Text style={styles.badgeTxtCopy}>{t("copied")}</Text>
                </View>
              )}
            </View>

            {/* Title + description */}
            <Text style={[styles.heroTitle, deck.cover_image_url && styles.heroTitleOnCover]}>
              {deck.title}
            </Text>
            {deck.description ? (
              <Text style={[styles.heroDesc, deck.cover_image_url && styles.heroDescOnCover]}>
                {deck.description}
              </Text>
            ) : null}
          </View>

          {/* ════════════ STATS ROW ════════════ */}
          <View style={styles.statsRow}>
            <StatChip icon="layers" value={totalCards} label={t("totalCards")} color="#6366f1" />
            <View style={styles.statsDivider} />
            <StatChip icon="clock" value={dueToday} label={t("dueToday")} color="#d97706" />
            <View style={styles.statsDivider} />
            <StatChip icon="check-circle" value={`${progressPct}%`} label={t("learned") ?? "Вивчено"} color="#059669" />
          </View>

          {/* ────── Progress bar ────── */}
          {totalCards > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
              </View>
              <Text style={styles.progressLabel}>{progressPct}% {t("learned") ?? "вивчено"}</Text>
            </View>
          )}

          {/* ════════════ ACTIONS ════════════ */}
          <View style={styles.actions}>

            {/* Primary row: Review + Study (owner only) */}
            {isOwner && (
              <View style={styles.actionRowPrimary}>
                <ActionBtn
                  icon="book-open"
                  label={t("reviewCards")}
                  bg="#6366f1"
                  onPress={() => router.push(`/deck-review?id=${deck.deck_id}`)}
                  flex
                />
                <ActionBtn
                  icon="trending-up"
                  label={t("studying")}
                  bg="#059669"
                  onPress={() => router.push(`/deck-study?id=${deck.deck_id}`)}
                  flex
                />
              </View>
            )}

            {/* Secondary row */}
            <View style={styles.actionRowSecondary}>
              {isOwner && (
                <ActionBtn
                  icon="plus-circle"
                  label={t("addCard")}
                  bg="#fff"
                  textColor="#6366f1"
                  border
                  borderColor="rgba(99,102,241,0.25)"
                  onPress={() => router.push(`/add-card?deckId=${deck.deck_id}`)}
                  flex
                />
              )}
              {user && (
                <ActionBtn
                  icon="star"
                  label={t("rateComment")}
                  bg="#fff"
                  textColor="#d97706"
                  border
                  borderColor="rgba(217,119,6,0.25)"
                  onPress={() => router.push(`/deck-rate?id=${deck.deck_id}`)}
                  flex
                />
              )}
            </View>

            {/* Copy/update row */}
            {isOwner && isCopiedDeck && (
              <ActionBtn
                icon="refresh-cw"
                label={isUpdating ? `${t("saving")}...` : t("updateFromOriginal")}
                bg="#eef0ff"
                textColor="#6366f1"
                border
                borderColor="rgba(99,102,241,0.2)"
                onPress={handleUpdateFromOriginal}
                disabled={isUpdating}
                fullWidth
              />
            )}
            {isPublicFromOther && (
              <ActionBtn
                icon={hasCopy ? "check" : "download"}
                label={hasCopy ? t("alreadyInCollection") : (isCopying ? `${t("saving")}...` : t("addToMyAccount"))}
                bg={hasCopy ? "#f0fdf4" : "#6366f1"}
                textColor={hasCopy ? "#059669" : "#fff"}
                border={!!hasCopy}
                borderColor="rgba(5,150,105,0.3)"
                onPress={handleAddToMyAccount}
                disabled={hasCopy === true || isCopying}
                fullWidth
              />
            )}
          </View>

          {/* ════════════ CARDS SECTION ════════════ */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsSectionHeader}>
              <Text style={styles.cardsSectionTitle}>{t("cards")}</Text>
              <Text style={styles.cardsSectionCount}>{totalCards}</Text>
            </View>

            {cards.length === 0 ? (
              <View style={styles.emptyCards}>
                <View style={styles.emptyCardsIcon}>
                  <Feather name="credit-card" size={32} color="#c7d2fe" />
                </View>
                <Text style={styles.emptyCardsTitle}>{t("noCardsInDeck")}</Text>
                {isOwner && (
                  <TouchableOpacity
                    style={styles.emptyCardsBtn}
                    onPress={() => router.push(`/add-card?deckId=${deck.deck_id}`)}
                  >
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={styles.emptyCardsBtnTxt}>{t("addCard")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.cardsGrid, numCols === 2 && styles.cardsGridTwo]}>
                {cards.map((card, index) => (
                  <CardTile
                    key={card.card_id}
                    card={card}
                    index={index}
                    isOwner={!!isOwner}
                    numCols={numCols}
                    onEdit={() => router.push(`/add-card?deckId=${deckId}&cardId=${card.card_id}`)}
                    onDelete={() => handleDeleteCard(card)}
                    t={t}
                  />
                ))}
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      <ConfirmModal
        visible={Boolean(cardToDelete)}
        title={t("deleteCard")} message={t("deleteCardConfirm")}
        confirmText={t("delete")} cancelText={t("cancel")}
        destructive icon="trash-2"
        onConfirm={performDeleteCard} onCancel={() => setCardToDelete(null)}
      />
      <ConfirmModal
        visible={Boolean(errorModal)}
        title={t("error")} message={errorModal ?? ""}
        confirmText={t("ok")} cancelText={null}
        onConfirm={() => setErrorModal(null)} onCancel={() => setErrorModal(null)}
      />
    </>
  );
}

/* ─── StatChip ─── */
function StatChip({ icon, value, label, color }: {
  icon: keyof typeof Feather.glyphMap;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statChip}>
      <View style={[styles.statChipIcon, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.statChipValue, { color }]}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

/* ─── ActionBtn ─── */
function ActionBtn({
  icon, label, bg, textColor = "#fff", border, borderColor, onPress, disabled, flex, fullWidth,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  bg: string;
  textColor?: string;
  border?: boolean;
  borderColor?: string;
  onPress: () => void;
  disabled?: boolean;
  flex?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        { backgroundColor: bg },
        border && { borderWidth: 1.5, borderColor: borderColor ?? textColor },
        flex && { flex: 1 },
        fullWidth && { width: "100%" },
        disabled && styles.actionBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Feather name={icon} size={18} color={textColor} />
      <Text style={[styles.actionBtnTxt, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ─── CardTile ─── */
function CardTile({ card, index, isOwner, numCols, onEdit, onDelete, t }: {
  card: Card;
  index: number;
  isOwner: boolean;
  numCols: number;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  const accentColors = ["#4255ff", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9"];
  const accent = accentColors[index % accentColors.length];

  return (
    <View style={[styles.cardTile, numCols === 2 && styles.cardTileHalf]}>
      {/* Number badge */}
      <View style={[styles.cardNumBadge, { backgroundColor: `${accent}18` }]}>
        <Text style={[styles.cardNumTxt, { color: accent }]}>{index + 1}</Text>
      </View>

      {/* Front */}
      {card.front_media_url ? (
        <Image source={{ uri: card.front_media_url }} style={styles.cardMedia} resizeMode="contain" />
      ) : null}
      <Text style={styles.cardFront} numberOfLines={4}>{card.front_text}</Text>

      {/* Divider with arrow */}
      <View style={styles.cardDividerRow}>
        <View style={[styles.cardDividerLine, { backgroundColor: `${accent}30` }]} />
        <View style={[styles.cardDividerArrow, { backgroundColor: `${accent}18` }]}>
          <Feather name="arrow-down" size={11} color={accent} />
        </View>
        <View style={[styles.cardDividerLine, { backgroundColor: `${accent}30` }]} />
      </View>

      {/* Back */}
      {card.back_media_url ? (
        <Image source={{ uri: card.back_media_url }} style={styles.cardMedia} resizeMode="contain" />
      ) : null}
      <Text style={styles.cardBack} numberOfLines={4}>{card.back_text}</Text>

      {/* Notes */}
      {card.notes ? (
        <View style={styles.cardNotesRow}>
          <Feather name="file-text" size={12} color="#9ca3af" />
          <Text style={styles.cardNotes} numberOfLines={2}>{card.notes}</Text>
        </View>
      ) : null}

      {/* Actions */}
      {isOwner && (
        <View style={styles.cardActionsRow}>
          <Pressable style={styles.cardActEdit} onPress={onEdit} hitSlop={6}>
            <Feather name="edit-2" size={14} color="#4255ff" />
            <Text style={styles.cardActEditTxt}>{t("edit")}</Text>
          </Pressable>
          <Pressable style={styles.cardActDel} onPress={onDelete} hitSlop={6}>
            <Feather name="trash-2" size={14} color="#dc2626" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f6fa" },
  contentOuter: { alignItems: "center", paddingBottom: 40 },
  pageWrap: { width: "100%", maxWidth: 1000, paddingHorizontal: 0 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#f5f6fa" },
  errorMsg: { fontSize: 16, color: "#6b7280", textAlign: "center", paddingHorizontal: 32 },
  backBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: "#eef0ff" },
  backBtnTxt: { color: "#6366f1", fontWeight: "600" },

  /* ── HERO ── */
  hero: {
    width: "100%",
    minHeight: 160,
    backgroundColor: "#C6E3ED",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 36,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#C6E3ED",
  },
  /* decorative soft circle */
  heroBadgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  badgePublic: { backgroundColor: "rgba(5,150,105,0.12)", borderWidth: 1, borderColor: "rgba(5,150,105,0.25)" },
  badgePrivate: { backgroundColor: "rgba(71,85,105,0.1)", borderWidth: 1, borderColor: "rgba(71,85,105,0.2)" },
  badgeTxt: { fontSize: 12, fontWeight: "600" },
  badgeTxtPublic: { color: "#047857" },
  badgeTxtPrivate: { color: "#475569" },
  badgeCopy: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(99,102,241,0.1)", borderWidth: 1, borderColor: "rgba(99,102,241,0.22)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  badgeTxtCopy: { fontSize: 12, fontWeight: "600", color: "#4f46e5" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#1e293b", letterSpacing: 0.1 },
  heroTitleOnCover: { color: "#fff", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroDesc: { marginTop: 6, fontSize: 14, color: "#334155", lineHeight: 20 },
  heroDescOnCover: { color: "rgba(255,255,255,0.85)", textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  /* ── STATS ── */
  statsRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8,
    shadowColor: "#4255ff", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  statsDivider: { width: 1, height: 40, backgroundColor: "#f0f1f5" },
  statChip: { flex: 1, alignItems: "center", gap: 4 },
  statChipIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  statChipValue: { fontSize: 18, fontWeight: "800" },
  statChipLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },

  /* ── PROGRESS ── */
  progressWrap: { marginHorizontal: 16, marginTop: 12, gap: 6 },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: "#e8eaee", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#059669" },
  progressLabel: { fontSize: 12, color: "#9ca3af", textAlign: "right" },

  /* ── ACTIONS ── */
  actions: { marginHorizontal: 16, marginTop: 16, gap: 10 },
  actionRowPrimary: { flexDirection: "row", gap: 10 },
  actionRowSecondary: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, minHeight: 50,
    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  actionBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  actionBtnTxt: { fontSize: 15, fontWeight: "700" },

  /* ── CARDS SECTION ── */
  cardsSection: { marginHorizontal: 16, marginTop: 24 },
  cardsSectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  cardsSectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  cardsSectionCount: {
    fontSize: 13, color: "#6366f1", fontWeight: "600",
    backgroundColor: "rgba(99,102,241,0.1)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
  },

  /* ── Empty state ── */
  emptyCards: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyCardsIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(99,102,241,0.08)", alignItems: "center", justifyContent: "center",
  },
  emptyCardsTitle: { fontSize: 16, color: "#9ca3af" },
  emptyCardsBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#6366f1", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4,
  },
  emptyCardsBtnTxt: { color: "#fff", fontWeight: "600" },

  /* ── Cards Grid ── */
  cardsGrid: { gap: 10 },
  cardsGridTwo: { flexDirection: "row", flexWrap: "wrap" },

  /* ── Card Tile ── */
  cardTile: {
    backgroundColor: "#fff",
    borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: "#4255ff", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  cardTileHalf: { flex: 1, minWidth: "47%", marginHorizontal: 4 },

  cardNumBadge: {
    alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 999, marginBottom: 10,
  },
  cardNumTxt: { fontSize: 12, fontWeight: "700" },

  cardMedia: { width: "100%", height: 100, borderRadius: 10, marginBottom: 8, backgroundColor: "#f3f4f6" },

  cardFront: { fontSize: 17, fontWeight: "700", color: "#111827", lineHeight: 24 },

  cardDividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 8 },
  cardDividerLine: { flex: 1, height: 1 },
  cardDividerArrow: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },

  cardBack: { fontSize: 15, color: "#4b5563", lineHeight: 22 },

  cardNotesRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10 },
  cardNotes: { flex: 1, fontSize: 13, color: "#9ca3af", fontStyle: "italic", lineHeight: 18 },

  cardActionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  cardActEdit: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(99,102,241,0.08)" },
  cardActEditTxt: { fontSize: 13, color: "#6366f1", fontWeight: "600" },
  cardActDel: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(220,38,38,0.07)" },
});
