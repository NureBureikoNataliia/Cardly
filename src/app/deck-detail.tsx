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
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import type { TextStyle } from "react-native";

import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStudySettings } from "@/src/contexts/StudySettingsContext";
import { fetchUserProgressForDeck, getDueTodayCountForUser } from "@/src/lib/userCardProgress";
import ConfirmModal from "@/src/components/ConfirmModal";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { useAppColors } from "@/src/contexts/ThemeContext";

const scrollPositions: Record<string, number> = {};

/** Web: hide browser default focus outline (RN TextStyle typings omit outlineStyle "none"). */
const webTextInputNoOutline: TextStyle | undefined =
  Platform.OS === "web"
    ? ({ outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle)
    : undefined;

type Collaborator = {
  deck_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string | null;
};

type UserSearchResult = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export default function DeckDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const deckId = typeof params.id === "string" ? params.id : null;
  const { t } = useLanguage();
  const C = useAppColors();
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

  // ── Collaborators ──
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [learnedInfoOpen, setLearnedInfoOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [collaboratorToRemove, setCollaboratorToRemove] = useState<Collaborator | null>(null);

  // ── Members map: userId → displayName (for card author labels) ──
  const [membersMap, setMembersMap] = useState<Record<string, string>>({});

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

  // ── Load collaborators ──
  const loadCollaborators = useCallback(async () => {
    if (!deckId) return;
    const { data } = await supabase.rpc("get_deck_collaborators", { p_deck_id: deckId });
    if (data) setCollaborators(data as Collaborator[]);
  }, [deckId]);

  useEffect(() => { loadCollaborators(); }, [loadCollaborators]);

  // ── Build membersMap: userId → displayName ──
  useEffect(() => {
    if (!deck || !user) return;
    const map: Record<string, string> = {};
    // current user always known
    map[user.id] = (user.user_metadata?.username as string | undefined)
      ?? user.email?.split('@')[0]
      ?? 'me';
    // accepted collaborators
    collaborators.forEach((c) => {
      if (c.status === 'accepted' || c.status == null) {
        map[c.user_id] = c.display_name || c.username;
      }
    });
    setMembersMap(map);
    // fetch owner's name if not already in map (viewing as collaborator)
    if (deck.creator_id && !map[deck.creator_id]) {
      supabase
        .rpc('get_user_display_name', { p_user_id: deck.creator_id })
        .then(({ data }) => {
          if (data) setMembersMap((prev) => ({ ...prev, [deck.creator_id]: data as string }));
        });
    }
  }, [deck, user, collaborators]);

  // ── Search users by username ──
  const handleSearchUser = useCallback(async (query: string) => {
    setCollaboratorSearch(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const { data } = await supabase.rpc("find_user_by_username", { search_username: query.trim() });
    setIsSearching(false);
    setSearchResults((data as UserSearchResult[]) ?? []);
  }, []);

  // ── Invite collaborator ──
  const handleInvite = useCallback(async (targetUserId: string, targetUsername?: string) => {
    if (!deckId || isInviting) return;

    // Block inviting the owner of the original deck (to avoid duplicates in their "Your Decks")
    if (deck?.original_deck_id) {
      const { data: origDeck } = await supabase
        .from("decks")
        .select("creator_id")
        .eq("deck_id", deck.original_deck_id)
        .single();
      if (origDeck?.creator_id === targetUserId) {
        setInviteMsg({ text: t("cannotInviteOriginalCreator"), ok: false });
        return;
      }
    }

    const existing = collaborators.find((c) => c.user_id === targetUserId);
    if (existing?.status === 'accepted') {
      setInviteMsg({ text: t("inviteAlready"), ok: false });
      return;
    }
    if (existing?.status === 'pending') {
      setInviteMsg({ text: t("inviteAlreadyPending"), ok: false });
      return;
    }
    setIsInviting(true);
    setInviteMsg(null);
    const { error } = await supabase.from("deck_collaborators").insert({
      deck_id: deckId,
      user_id: targetUserId,
      role: "editor",
      status: "pending",
      invited_by: user?.id,
    });
    setIsInviting(false);
    if (error) {
      setInviteMsg({ text: error.message || t("inviteError"), ok: false });
    } else {
      const name = targetUsername ? `@${targetUsername}` : "";
      setInviteMsg({ text: `${t("inviteSuccess")}${name ? ` → ${name}` : ""}`, ok: true });
      setCollaboratorSearch("");
      setSearchResults([]);
      loadCollaborators();
    }
  }, [deckId, deck, collaborators, isInviting, user?.id, t, loadCollaborators]);

  // ── Remove collaborator ──
  const handleRemoveCollaborator = useCallback(async () => {
    if (!collaboratorToRemove) return;
    const row = collaboratorToRemove;
    setCollaboratorToRemove(null);
    await supabase
      .from("deck_collaborators")
      .delete()
      .eq("deck_id", row.deck_id)
      .eq("user_id", row.user_id);
    setCollaborators((prev) =>
      prev.filter((c) => !(c.deck_id === row.deck_id && c.user_id === row.user_id))
    );
  }, [collaboratorToRemove]);

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

  const { settings: studySettings } = useStudySettings();

  const dueToday = useMemo(() => {
    if (!user) return totalCards;
    return getDueTodayCountForUser(
      cards.map((c) => c.card_id),
      progressMap,
      new Date(),
      studySettings.srsDayStartHour
    );
  }, [user, totalCards, cards, progressMap, studySettings.srsDayStartHour]);

  const dueNowCount = useMemo(() => {
    if (!user) return 0;
    const now = Date.now();
    return cards.filter((c) => {
      const p = progressMap.get(c.card_id);
      if (!p) return true;
      if (p.due_date == null) return true;
      const t = new Date(p.due_date).getTime();
      if (Number.isNaN(t)) return true;
      return t <= now;
    }).length;
  }, [user, cards, progressMap]);

  const isOwner = deck && user && deck.creator_id === user.id;
  // treat missing status (old DB without status column) as 'accepted' for backward compat
  const isCollaborator = !isOwner && collaborators.some(
    (c) => c.user_id === user?.id && c.status !== 'pending' && c.status !== 'declined'
  );
  const canEdit = isOwner || isCollaborator;
  const isPublicFromOther = !canEdit && deck?.is_public;

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
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error || !deck) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={40} color="#d1d5db" />
        <Text style={[styles.errorMsg, { color: C.textSub }]}>{error ?? t("deckNotFound")}</Text>
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
        style={[styles.root, { backgroundColor: C.bg }]}
        contentContainerStyle={styles.contentOuter}
        onScroll={(e) => { if (deckId) scrollPositions[deckId] = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
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
              <View style={[
                styles.badge,
                deck.cover_image_url
                  ? styles.badgeOnCover
                  : (deck.is_public ? styles.badgePublic : styles.badgePrivate),
              ]}>
                <Feather
                  name={deck.is_public ? "globe" : "lock"}
                  size={11}
                  color={deck.cover_image_url ? "#fff" : (deck.is_public ? "#059669" : "#9ca3af")}
                />
                <Text style={[
                  styles.badgeTxt,
                  deck.cover_image_url
                    ? styles.badgeTxtOnCover
                    : (deck.is_public ? styles.badgeTxtPublic : styles.badgeTxtPrivate),
                ]}>
                  {deck.is_public ? t("public") : t("private")}
                </Text>
              </View>
              {isCopiedDeck && (
                <View style={[styles.badgeCopy, deck.cover_image_url && styles.badgeOnCover]}>
                  <Feather name="copy" size={11} color={deck.cover_image_url ? "#fff" : "#8b5cf6"} />
                  <Text style={[styles.badgeTxtCopy, deck.cover_image_url && styles.badgeTxtOnCover]}>
                    {t("copied")}
                  </Text>
                </View>
              )}
            </View>

            {/* Title + description */}
            <Text style={[styles.heroTitle, { color: C.text }, deck.cover_image_url && styles.heroTitleOnCover]}>
              {deck.title}
            </Text>
            {deck.description ? (
              <Text style={[styles.heroDesc, { color: C.textSub }, deck.cover_image_url && styles.heroDescOnCover]}>
                {deck.description}
              </Text>
            ) : null}
          </View>

          {/* ════════════ STATS ROW ════════════ */}
          <View style={[styles.statsRow, { backgroundColor: C.surface }]}>
            <StatChip icon="layers" value={totalCards} label={t("totalCards")} color="#6366f1" />
            <View style={[styles.statsDivider, { backgroundColor: C.borderLight }]} />
            <StatChip icon="clock" value={dueToday} label={t("dueToday")} color="#d97706" />
            <View style={[styles.statsDivider, { backgroundColor: C.borderLight }]} />
            <StatChip
              icon="check-circle"
              value={`${progressPct}%`}
              label={t("learned")}
              color="#059669"
              onInfoPress={() => setLearnedInfoOpen(true)}
              infoAccessibilityLabel={t("learnedPercentInfoTitle")}
            />
          </View>

          {/* ────── Progress bar ────── */}
          {totalCards > 0 && (
            <View style={styles.progressWrap}>
              <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>
                  {progressPct}% {t("learned")}
                </Text>
                <Pressable
                  onPress={() => setLearnedInfoOpen(true)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t("learnedPercentInfoTitle")}
                >
                  <Feather name="info" size={14} color="#9ca3af" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ════════════ ACTIONS ════════════ */}
          <View style={styles.actions}>

            {/* Co-author badge */}
            {isCollaborator && (
              <View style={styles.collaboratorBadge}>
                <Feather name="users" size={14} color="#6366f1" />
                <Text style={styles.collaboratorBadgeTxt}>{t("youAreCollaborator")}</Text>
              </View>
            )}

            {/* Primary: Study */}
            {canEdit && (
              <View style={styles.actionRowPrimary}>
                <ActionBtn
                  icon="trending-up"
                  label={t("studying")}
                  bg="#059669"
                  onPress={() => {
                    const onlyLaterToday = Boolean(user && dueNowCount === 0 && dueToday > 0);
                    router.push({
                      pathname: "/deck-study",
                      params: onlyLaterToday
                        ? { id: deck.deck_id, today: "1" }
                        : { id: deck.deck_id },
                    });
                  }}
                  flex
                />
              </View>
            )}

            {canEdit && user && dueToday > 0 && dueToday > dueNowCount && dueNowCount > 0 && (
              <View style={styles.actionRowPrimary}>
                <ActionBtn
                  icon="zap"
                  label={t("studyAllToday")}
                  bg="#ecfdf5"
                  textColor="#047857"
                  border
                  borderColor="rgba(4,120,87,0.35)"
                  onPress={() =>
                    router.push({ pathname: "/deck-study", params: { id: deck.deck_id, today: "1" } })
                  }
                  flex
                />
              </View>
            )}

            {/* Secondary row */}
            <View style={styles.actionRowSecondary}>
              {canEdit && (
                <ActionBtn
                  icon="plus-circle"
                  label={t("addCard")}
                  bg={C.surface}
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
                  bg={C.surface}
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

          {/* ════════════ COLLABORATORS SECTION (owner only) ════════════ */}
          {isOwner && (
            <View style={[styles.collabSection, { backgroundColor: C.surface }]}>
              {/* Toggle button */}
              <TouchableOpacity
                style={styles.collabToggleBtn}
                onPress={() => {
                  setCollabOpen(v => !v);
                  setInviteMsg(null);
                  setSearchResults([]);
                  setCollaboratorSearch("");
                }}
                activeOpacity={0.8}
              >
                <View style={styles.collabToggleLeft}>
                  <View style={styles.collabToggleIcon}>
                    <Feather name="users" size={16} color="#6366f1" />
                  </View>
                  <Text style={[styles.collabToggleTitle, { color: C.text }]}>{t("collaborators")}</Text>
                  {collaborators.filter(c => c.status !== 'pending' && c.status !== 'declined').length > 0 && (
                    <View style={styles.collabToggleBadge}>
                      <Text style={styles.collabToggleBadgeTxt}>
                        {collaborators.filter(c => c.status !== 'pending' && c.status !== 'declined').length}
                      </Text>
                    </View>
                  )}
                </View>
                <Feather name={collabOpen ? "chevron-up" : "chevron-down"} size={18} color="#6b7280" />
              </TouchableOpacity>

              {/* Expandable content */}
              {collabOpen && (
                <View style={[styles.collabBody, { borderTopColor: C.borderLight }]}>
                  {/* Invite input */}
                  <View style={styles.inviteRow}>
                    <View style={[styles.inviteInputWrap, { backgroundColor: C.inputBg, borderColor: C.inputBorder }]}>
                      <Feather name="search" size={15} color={collaboratorSearch.length > 0 ? "#6366f1" : "#b0b8c8"} />
                      <TextInput
                        style={[styles.inviteInput, webTextInputNoOutline, { color: C.text }]}
                        placeholder={t("searchByUsername")}
                        placeholderTextColor={C.placeholder}
                        value={collaboratorSearch}
                        onChangeText={handleSearchUser}
                        autoCapitalize="none"
                      />
                      {isSearching && <ActivityIndicator size="small" color="#6366f1" />}
                      {collaboratorSearch.length > 0 && !isSearching && (
                        <Pressable onPress={() => { setCollaboratorSearch(""); setSearchResults([]); }} hitSlop={8}>
                          <Feather name="x" size={15} color="#b0b8c8" />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <View style={styles.searchResultsList}>
                      {searchResults.map((u) => {
                        const existing = collaborators.find((c) => c.user_id === u.user_id);
                        const isPending = existing?.status === 'pending';
                        const isAccepted = existing?.status === 'accepted';
                        const isDisabled = isPending || isAccepted || isInviting;
                        return (
                          <View key={u.user_id} style={[styles.searchResultItem, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                            <View style={styles.searchResultAvatar}>
                              {u.avatar_url
                                ? <Image source={{ uri: u.avatar_url }} style={styles.searchResultAvatarImg} />
                                : <Text style={styles.searchResultAvatarTxt}>{(u.username ?? "?")[0].toUpperCase()}</Text>
                              }
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.searchResultName}>{u.display_name || u.username}</Text>
                              <Text style={styles.searchResultUsername}>@{u.username}</Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.inviteBtn,
                                isAccepted && styles.inviteBtnDone,
                                isPending && styles.inviteBtnPending,
                              ]}
                              onPress={() => !isDisabled && handleInvite(u.user_id, u.username)}
                              disabled={isDisabled}
                            >
                              <Feather
                                name={isAccepted ? "check" : isPending ? "clock" : "user-plus"}
                                size={14}
                                color={isAccepted ? "#059669" : isPending ? "#d97706" : "#fff"}
                              />
                              <Text style={[
                                styles.inviteBtnTxt,
                                isAccepted && styles.inviteBtnTxtDone,
                                isPending && styles.inviteBtnTxtPending,
                              ]}>
                                {isAccepted ? t("inviteAlready") : isPending ? t("invitePending") : t("invite")}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Invite message */}
                  {inviteMsg && (
                    <View style={[styles.inviteMsg, inviteMsg.ok ? styles.inviteMsgOk : styles.inviteMsgErr]}>
                      <Feather name={inviteMsg.ok ? "check-circle" : "alert-circle"} size={14} color={inviteMsg.ok ? "#059669" : "#dc2626"} />
                      <Text style={[styles.inviteMsgTxt, inviteMsg.ok ? styles.inviteMsgTxtOk : styles.inviteMsgTxtErr]}>{inviteMsg.text}</Text>
                    </View>
                  )}

                  {/* Collaborators list — only accepted */}
                  {collaborators.filter(c => c.status !== 'pending' && c.status !== 'declined').length === 0 ? (
                    <Text style={styles.noCollabTxt}>{t("noCollaborators")}</Text>
                  ) : (
                    <View style={styles.collabList}>
                      {collaborators
                        .filter(c => c.status !== 'pending' && c.status !== 'declined')
                        .map((c) => (
                          <View key={`${c.deck_id}_${c.user_id}`} style={[styles.collabItem, { borderBottomColor: C.borderLight }]}>
                            <View style={styles.collabAvatar}>
                              {c.avatar_url
                                ? <Image source={{ uri: c.avatar_url }} style={styles.collabAvatarImg} />
                                : <Text style={styles.collabAvatarTxt}>{(c.username ?? "?")[0].toUpperCase()}</Text>
                              }
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.collabName, { color: C.text }]}>{c.display_name || c.username}</Text>
                              <Text style={[styles.collabMeta, { color: C.textMuted }]}>@{c.username}</Text>
                            </View>
                            <Pressable
                              style={styles.collabRemoveBtn}
                              onPress={() => setCollaboratorToRemove(c)}
                              hitSlop={8}
                            >
                              <Feather name="user-x" size={15} color="#dc2626" />
                            </Pressable>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ════════════ CARDS SECTION ════════════ */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsSectionHeader}>
              <Text style={[styles.cardsSectionTitle, { color: C.text }]}>{t("cardsSectionTitle")}</Text>
              <Text style={styles.cardsSectionCount}>{totalCards}</Text>
            </View>

            {cards.length === 0 ? (
              <View style={styles.emptyCards}>
                <View style={styles.emptyCardsIcon}>
                  <Feather name="credit-card" size={32} color="#c7d2fe" />
                </View>
                <Text style={styles.emptyCardsTitle}>{t("noCardsInDeck")}</Text>
                {canEdit && (
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
                    isOwner={!!canEdit}
                    numCols={numCols}
                    createdByName={
                      card.created_by
                        ? (membersMap[card.created_by] ?? null)
                        : (deck ? (membersMap[deck.creator_id] ?? null) : null)
                    }
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
        visible={learnedInfoOpen}
        title={t("learnedPercentInfoTitle")}
        message={t("learnedPercentInfoBody")}
        confirmText={t("ok")}
        cancelText={null}
        icon="info"
        onConfirm={() => setLearnedInfoOpen(false)}
        onCancel={() => setLearnedInfoOpen(false)}
      />

      <ConfirmModal
        visible={Boolean(collaboratorToRemove)}
        title={t("removeCollaborator")}
        message={t("removeCollaboratorConfirm")}
        confirmText={t("removeCollaborator")}
        cancelText={t("cancel")}
        destructive
        icon="user-x"
        onConfirm={handleRemoveCollaborator}
        onCancel={() => setCollaboratorToRemove(null)}
      />

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
function StatChip({ icon, value, label, color, onInfoPress, infoAccessibilityLabel }: {
  icon: keyof typeof Feather.glyphMap;
  value: number | string;
  label: string;
  color: string;
  onInfoPress?: () => void;
  infoAccessibilityLabel?: string;
}) {
  return (
    <View style={styles.statChip}>
      {onInfoPress ? (
        <View style={styles.statChipIconWithInfo}>
          <View style={[styles.statChipIcon, { backgroundColor: `${color}18` }]}>
            <Feather name={icon} size={15} color={color} />
          </View>
          <Pressable
            style={styles.statChipInfoHit}
            onPress={onInfoPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={infoAccessibilityLabel ?? label}
          >
            <Feather name="info" size={14} color={color} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.statChipIcon, { backgroundColor: `${color}18` }]}>
          <Feather name={icon} size={15} color={color} />
        </View>
      )}
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
function CardTile({ card, index, isOwner, numCols, createdByName, onEdit, onDelete, t }: {
  card: Card;
  index: number;
  isOwner: boolean;
  numCols: number;
  createdByName: string | null;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  const C = useAppColors();
  const accentColors = ["#4255ff", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9"];
  const accent = accentColors[index % accentColors.length];

  return (
    <View style={[styles.cardTile, numCols === 2 && styles.cardTileHalf, { backgroundColor: C.surface }]}>
      {/* Number badge + author */}
      <View style={styles.cardTileHeader}>
        <View style={[styles.cardNumBadge, { backgroundColor: `${accent}18` }]}>
          <Text style={[styles.cardNumTxt, { color: accent }]}>{index + 1}</Text>
        </View>
        {createdByName ? (
          <View style={[styles.cardAuthorRow, { backgroundColor: C.surfaceAlt }]}>
            <Feather name="user" size={10} color={C.textMuted} />
            <Text style={[styles.cardAuthorTxt, { color: C.textSub }]}>{createdByName}</Text>
          </View>
        ) : null}
      </View>

      {/* Front */}
      {card.front_media_url ? (
        <Image source={{ uri: card.front_media_url }} style={[styles.cardMedia, { backgroundColor: C.surfaceAlt }]} resizeMode="contain" />
      ) : null}
      <Text style={[styles.cardFront, { color: C.text }]} numberOfLines={4}>{card.front_text}</Text>

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
        <Image source={{ uri: card.back_media_url }} style={[styles.cardMedia, { backgroundColor: C.surfaceAlt }]} resizeMode="contain" />
      ) : null}
      <Text style={[styles.cardBack, { color: C.textSub }]} numberOfLines={4}>{card.back_text}</Text>

      {/* Notes */}
      {card.notes ? (
        <View style={styles.cardNotesRow}>
          <Feather name="file-text" size={12} color={C.textMuted} />
          <Text style={[styles.cardNotes, { color: C.textMuted }]} numberOfLines={2}>{card.notes}</Text>
        </View>
      ) : null}

      {/* Actions */}
      {isOwner && (
        <View style={[styles.cardActionsRow, { borderTopColor: C.borderLight }]}>
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
  root: { flex: 1 },
  contentOuter: { alignItems: "center", paddingBottom: 40 },
  pageWrap: { width: "100%", maxWidth: 1000, paddingHorizontal: 0 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
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
  badgeOnCover: { backgroundColor: "rgba(0,0,0,0.52)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  badgeTxt: { fontSize: 12, fontWeight: "600" },
  badgeTxtPublic: { color: "#047857" },
  badgeTxtPrivate: { color: "#475569" },
  badgeTxtOnCover: { color: "#fff", textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
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
  /** Main icon stays centered like other chips; info sits to the right, outside the centering width. */
  statChipIconWithInfo: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  statChipInfoHit: {
    position: "absolute",
    left: "100%",
    marginLeft: 4,
    height: 32,
    justifyContent: "center",
  },
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
  progressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    alignSelf: "flex-end",
  },
  progressLabel: { fontSize: 12, color: "#9ca3af" },

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

  cardTileHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 10,
  },
  cardNumBadge: {
    alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 999,
  },
  cardNumTxt: { fontSize: 12, fontWeight: "700" },
  cardAuthorRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f3f4f6", borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  cardAuthorTxt: { fontSize: 11, color: "#6b7280", fontWeight: "500" },

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

  /* ── Collaborator badge (for co-authors) ── */
  collaboratorBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(99,102,241,0.08)", borderWidth: 1, borderColor: "rgba(99,102,241,0.2)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  collaboratorBadgeTxt: { fontSize: 14, color: "#6366f1", fontWeight: "600" },

  /* ── Collaborators section ── */
  collabSection: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: "#fff", borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    overflow: "hidden",
  },
  collabToggleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  collabToggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  collabToggleIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center", alignItems: "center",
  },
  collabToggleTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  collabToggleBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: "#6366f1",
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 5,
  },
  collabToggleBadgeTxt: { fontSize: 11, fontWeight: "700", color: "#fff" },
  collabBody: {
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
    padding: 16, gap: 12,
  },
  inviteRow: { gap: 8 },
  inviteInputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#f7f8fb", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e8eaee",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  inviteInput: {
    flex: 1, fontSize: 14, color: "#111827", paddingVertical: 0,
  },
  searchResultsList: {
    borderRadius: 12, borderWidth: 1, borderColor: "#e8eaee",
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  searchResultAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(99,102,241,0.12)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  searchResultAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  searchResultAvatarTxt: { fontSize: 15, fontWeight: "700", color: "#6366f1" },
  searchResultName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  searchResultUsername: { fontSize: 12, color: "#9ca3af" },
  inviteBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#6366f1", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  inviteBtnDone: { backgroundColor: "rgba(5,150,105,0.1)", borderWidth: 1, borderColor: "rgba(5,150,105,0.25)" },
  inviteBtnPending: { backgroundColor: "rgba(217,119,6,0.1)", borderWidth: 1, borderColor: "rgba(217,119,6,0.25)" },
  inviteBtnTxt: { fontSize: 13, fontWeight: "600", color: "#fff" },
  inviteBtnTxtDone: { color: "#059669" },
  inviteBtnTxtPending: { color: "#d97706" },
  inviteMsg: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  inviteMsgOk: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "rgba(5,150,105,0.2)" },
  inviteMsgErr: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "rgba(220,38,38,0.2)" },
  inviteMsgTxt: { fontSize: 13, fontWeight: "500" },
  inviteMsgTxtOk: { color: "#059669" },
  inviteMsgTxtErr: { color: "#dc2626" },
  noCollabTxt: { fontSize: 14, color: "#9ca3af", textAlign: "center", paddingVertical: 12 },
  collabList: { gap: 2 },
  collabItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  collabAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(99,102,241,0.12)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  collabAvatarPending: { backgroundColor: "rgba(217,119,6,0.12)", opacity: 0.75 },
  collabAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  collabAvatarTxt: { fontSize: 16, fontWeight: "700", color: "#6366f1" },
  collabName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  collabMeta: { fontSize: 12, color: "#9ca3af" },
  collabRemoveBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: "rgba(220,38,38,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  pendingBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(217,119,6,0.1)",
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(217,119,6,0.25)",
  },
  pendingBadgeTxt: { fontSize: 10, fontWeight: "600", color: "#d97706" },
});
