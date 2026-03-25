import { Deck } from "@/assets/data/decks";
import { Card } from "@/assets/data/cards";
import { Text, View } from "@/src/components/Themed";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/contexts/AuthContext";
import { fetchUserProgressForDeck, getDueTodayCountForUser } from "@/src/lib/userCardProgress";
import ConfirmModal from "@/src/components/ConfirmModal";
import { useLanguage } from "@/src/contexts/LanguageContext";

const scrollPositions: Record<string, number> = {};

const CARD_GRID_GUTTER = 10;

function gridColumnsForWidth(w: number): number {
  if (w >= 960) return 4;
  if (w >= 600) return 3;
  return 2;
}

export default function DeckDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const deckId = typeof params.id === "string" ? params.id : null;
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const [cardsGridWidth, setCardsGridWidth] = useState(0);

  const { user } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, import("@/src/lib/userCardProgress").UserCardProgress>>(new Map());
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
    if (!deckId) {
      setError(t("deckNotFound"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [{ data: deckData, error: deckError }, { data: cardsData, error: cardsError }] =
      await Promise.all([
        supabase
          .from("decks")
          .select("*")
          .eq("deck_id", deckId)
          .single(),
        supabase
          .from("cards")
          .select("*")
          .eq("deck_id", deckId)
          .order("created_at", { ascending: false }),
      ]);

    if (deckError || cardsError) {
      setError(t("failedToLoadDeck"));
    } else {
      setDeck(deckData as Deck);
      const list = (cardsData as Card[]) ?? [];
      setCards(list);
      setTotalCards(list.length);
      if (user?.id) {
        const cardIds = list.map((c) => c.card_id);
        const progress = await fetchUserProgressForDeck(user.id, cardIds);
        setProgressMap(progress);
      }
    }

    setLoading(false);
  }, [deckId, t, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData().then(() => {
        if (deckId && scrollPositions[deckId] > 0) {
          const y = scrollPositions[deckId];
          let attempts = 0;
          const attemptScroll = () => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({ y, animated: false });
            } else if (attempts < 20) {
              attempts++;
              setTimeout(attemptScroll, 50);
            }
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
      .from("decks")
      .select("deck_id")
      .eq("creator_id", user.id)
      .eq("original_deck_id", deck.deck_id)
      .limit(1);
    setHasCopy((data?.length ?? 0) > 0);
  }, [deck, user, isOwner]);

  useEffect(() => {
    if (isPublicFromOther) checkHasCopy();
  }, [isPublicFromOther, checkHasCopy]);

  const handleAddToMyAccount = async () => {
    if (!deck || !user || isCopying || hasCopy) return;
    setIsCopying(true);
    setError(null);
    try {
      const { data: newDeck, error: deckErr } = await supabase
        .from("decks")
        .insert({
          creator_id: user.id,
          title: deck.title,
          description: deck.description,
          cover_image_url: deck.cover_image_url,
          is_public: false,
          original_deck_id: deck.deck_id,
        })
        .select("deck_id")
        .single();

      if (deckErr) {
        setErrorModal(deckErr.message ?? t("failedToLoadData"));
        setIsCopying(false);
        return;
      }

      if (cards.length > 0) {
        const cardRows = cards.map((c) => ({
          deck_id: newDeck.deck_id,
          card_type: c.card_type ?? "basic",
          front_text: c.front_text,
          back_text: c.back_text,
          front_media_url: c.front_media_url,
          back_media_url: c.back_media_url,
          notes: c.notes,
        }));
        const { error: cardsErr } = await supabase.from("cards").insert(cardRows);
        if (cardsErr) {
          setErrorModal(cardsErr.message ?? t("failedToLoadData"));
          setIsCopying(false);
          return;
        }
      }

      setHasCopy(true);
      router.replace(`/deck-detail?id=${newDeck.deck_id}`);
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setIsCopying(false);
    }
  };

  const isCopiedDeck = Boolean(deck?.original_deck_id);

  const onCardsGridLayout = useCallback((e: LayoutChangeEvent) => {
    setCardsGridWidth(e.nativeEvent.layout.width);
  }, []);

  const gridColumns = useMemo(() => {
    const w = cardsGridWidth > 0 ? cardsGridWidth : Math.max(320, windowWidth - 32);
    return gridColumnsForWidth(w);
  }, [cardsGridWidth, windowWidth]);

  /** Equal-width tiles that grow to fill the row (space-between distributes leftover). */
  const cardFlexStyle = useMemo(() => {
    const n = gridColumns;
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: `${100 / n - 1.5}%` as const,
      maxWidth: `${100 / n}%` as const,
    };
  }, [gridColumns]);

  const handleUpdateFromOriginal = async () => {
    if (!deck || !deck.original_deck_id || isUpdating) return;
    setIsUpdating(true);
    setError(null);
    try {
      const { data: originalCards, error: fetchErr } = await supabase
        .from("cards")
        .select("front_text, back_text, notes, card_type, front_media_url, back_media_url")
        .eq("deck_id", deck.original_deck_id);

      if (fetchErr) {
        setErrorModal(fetchErr.message ?? t("failedToLoadData"));
        setIsUpdating(false);
        return;
      }

      const existingKeys = new Set(cards.map((c) => `${c.front_text}\0${c.back_text}`));
      const toAdd = (originalCards ?? []).filter(
        (oc) => !existingKeys.has(`${oc.front_text}\0${oc.back_text}`)
      );

      if (toAdd.length === 0) {
        setErrorModal(t("noNewCards"));
        setIsUpdating(false);
        return;
      }

      const cardRows = toAdd.map((c) => ({
        deck_id: deck.deck_id,
        card_type: c.card_type ?? "basic",
        front_text: c.front_text,
        back_text: c.back_text,
        front_media_url: c.front_media_url,
        back_media_url: c.back_media_url,
        notes: c.notes,
      }));
      const { error: insertErr } = await supabase.from("cards").insert(cardRows);
      if (insertErr) {
        setErrorModal(insertErr.message ?? t("failedToLoadData"));
        setIsUpdating(false);
        return;
      }
      await loadData();
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCard = (card: Card) => {
    setCardToDelete(card);
  };

  const performDeleteCard = async () => {
    if (!cardToDelete) return;
    const card = cardToDelete;
    setCardToDelete(null);

    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("card_id", card.card_id);

    if (error) {
      setErrorModal(error.message || t("failedToDeleteCard"));
      return;
    }
    setCards((prev) => prev.filter((c) => c.card_id !== card.card_id));
    setTotalCards((prev) => Math.max(0, prev - 1));
  };

  const handleEditCard = (card: Card) => {
    router.push(`/add-card?deckId=${deckId}&cardId=${card.card_id}`);
  };


  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("appName"),
    });

    return () => {
      navigation.setOptions({
        headerShown: undefined,
        tabBarStyle: undefined,
      });
    };
  }, [navigation, router, t]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.deckTitle}>{t("loadingDeck")}</Text>
      </View>
    );
  }

  if (error || !deck) {
    return (
      <View style={styles.container}>
        <Text style={styles.deckTitle}>{error ?? t("deckNotFound")}</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="never"
      onScroll={(e) => { if (deckId) scrollPositions[deckId] = e.nativeEvent.contentOffset.y; }}
      scrollEventThrottle={100}
    >
      {deck.cover_image_url && (
        <View style={styles.deckImageWrapper}>
          <Image
            source={{ uri: deck.cover_image_url }}
            style={styles.deckImage}
            resizeMode="cover"
          />
        </View>
      )}

      <Text style={[styles.deckTitle, !deck.cover_image_url && styles.deckTitleNoImage]}>
        {deck.title}
      </Text>

      {deck.description && (
        <Text style={styles.description}>{deck.description}</Text>
      )}

      <View style={styles.statsCard}>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>{t("dueToday")}</Text>
          <Text style={styles.statNumber}>{dueToday}</Text>
        </View>
        <View style={styles.statDividerVertical} />
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>{t("totalCards")}</Text>
          <Text style={styles.statNumber}>{totalCards}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {isOwner && (
          <>
            <TouchableOpacity
              style={[styles.button, styles.reviewButton]}
              onPress={() => router.push(`/deck-review?id=${deck.deck_id}`)}
              accessibilityRole="button"
              accessibilityLabel={t("reviewCards")}
            >
              <Feather name="book-open" size={22} color="#fff" />
              <Text style={styles.buttonText}>{t("reviewCards")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.studyButton]}
              onPress={() => router.push(`/deck-study?id=${deck.deck_id}`)}
              accessibilityRole="button"
              accessibilityLabel={t("studying")}
            >
              <Feather name="trending-up" size={22} color="#fff" />
              <Text style={styles.buttonText}>{t("studying")}</Text>
            </TouchableOpacity>
          </>
        )}
        {isOwner && (
          <TouchableOpacity
            style={[styles.button, styles.addButton]}
            onPress={() => router.push(`/add-card?deckId=${deck.deck_id}`)}
            accessibilityRole="button"
            accessibilityLabel={t("addCard")}
          >
            <Feather name="plus" size={22} color="#fff" />
            <Text style={styles.buttonText}>{t("addCard")}</Text>
          </TouchableOpacity>
        )}
        {isOwner && isCopiedDeck && (
          <TouchableOpacity
            style={[styles.button, styles.updateButton, isUpdating && styles.updateButtonDisabled]}
            onPress={handleUpdateFromOriginal}
            disabled={isUpdating}
            accessibilityRole="button"
            accessibilityLabel={t("updateFromOriginal")}
          >
            <Feather name="refresh-cw" size={22} color="#fff" />
            <Text style={styles.buttonText}>
              {isUpdating ? `${t("saving")}...` : t("updateFromOriginal")}
            </Text>
          </TouchableOpacity>
        )}
        {user && (
          <TouchableOpacity
            style={[styles.button, styles.rateButton]}
            onPress={() => router.push(`/deck-rate?id=${deck.deck_id}`)}
            accessibilityRole="button"
            accessibilityLabel={t("rateComment")}
          >
            <Feather name="star" size={22} color="#fff" />
            <Text style={styles.buttonText}>{t("rateComment")}</Text>
          </TouchableOpacity>
        )}
        {isPublicFromOther && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.addToAccountButton,
              (hasCopy || isCopying) && styles.addToAccountButtonDisabled,
            ]}
            onPress={handleAddToMyAccount}
            disabled={hasCopy === true || isCopying}
            accessibilityRole="button"
            accessibilityLabel={hasCopy ? t("alreadyInCollection") : t("addToMyAccount")}
          >
            {isCopying ? (
              <Text style={styles.buttonText}>{t("saving")}...</Text>
            ) : hasCopy ? (
              <>
                <Feather name="check" size={22} color="#fff" />
                <Text style={styles.buttonText}>{t("alreadyInCollection")}</Text>
              </>
            ) : (
              <>
                <Feather name="download" size={22} color="#fff" />
                <Text style={styles.buttonText}>{t("addToMyAccount")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardsListContainer} onLayout={onCardsGridLayout}>
          {cards.length === 0 ? (
            <Text style={styles.emptyCardsText}>{t("noCardsInDeck")}</Text>
          ) : (
            cards.map((card, index) => (
              <View
                key={card.card_id}
                style={[
                  styles.cardItem,
                  cardFlexStyle,
                  index % 2 === 0 && styles.cardItemAlt,
                ]}
              >
                <View style={styles.cardAccent} />
                <View style={styles.cardItemInner}>
                  <View style={styles.cardContent}>
                    {card.front_media_url ? (
                      <Image
                        source={{ uri: card.front_media_url }}
                        style={[styles.cardMedia, gridColumns >= 3 && styles.cardMediaCompact]}
                        resizeMode="contain"
                      />
                    ) : null}
                    <Text style={[styles.cardFront, gridColumns >= 3 && styles.cardFrontCompact]} numberOfLines={4}>
                      {card.front_text}
                    </Text>
                    {card.back_media_url ? (
                      <Image
                        source={{ uri: card.back_media_url }}
                        style={[styles.cardMedia, gridColumns >= 3 && styles.cardMediaCompact]}
                        resizeMode="contain"
                      />
                    ) : null}
                    <Text style={[styles.cardBack, gridColumns >= 3 && styles.cardBackCompact]} numberOfLines={4}>
                      {card.back_text}
                    </Text>
                    {card.notes ? (
                      <Text style={styles.cardNotes} numberOfLines={2}>
                        {card.notes}
                      </Text>
                    ) : null}
                  </View>
                  {isOwner && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.cardActionButton, styles.cardEditButton]}
                        onPress={() => handleEditCard(card)}
                        accessibilityRole="button"
                        accessibilityLabel={t("editCard")}
                        activeOpacity={0.7}
                      >
                        <Feather name="edit-2" size={16} color="#4255ff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardActionButton, styles.cardDeleteButton]}
                        onPress={() => handleDeleteCard(card)}
                        accessibilityRole="button"
                        accessibilityLabel={t("deleteCard")}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
    </ScrollView>

    <ConfirmModal
      visible={Boolean(cardToDelete)}
      title={t("deleteCard")}
      message={t("deleteCardConfirm")}
      confirmText={t("delete")}
      cancelText={t("cancel")}
      destructive
      icon="trash-2"
      onConfirm={performDeleteCard}
      onCancel={() => setCardToDelete(null)}
    />

    <ConfirmModal
      visible={Boolean(errorModal)}
      title={t("error")}
      message={errorModal ?? ""}
      confirmText={t("ok")}
      cancelText={null}
      onConfirm={() => setErrorModal(null)}
      onCancel={() => setErrorModal(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#f3f4f6",
  },
  contentContainer: {
    alignItems: "stretch",
    alignSelf: "stretch",
    width: "100%",
    paddingBottom: 24,
  },
  deckImage: {
    width: "100%",
    height: 200,
  },
  deckImageWrapper: {
    width: "100%",
    alignSelf: "stretch",
  },
  deckTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 24,
    textAlign: "center",
    paddingHorizontal: 16,
  },  deckTitleNoImage: {
    marginTop: 60,
  },  description: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
    opacity: 0.7,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statCell: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  statDividerVertical: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#e5e7eb",
    marginVertical: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.65,
    color: "#374151",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "flex-start",
    alignSelf: "stretch",
    paddingHorizontal: 16,
    width: "100%",
    rowGap: 12,
    marginBottom: 8,
  },
  button: {
    flexDirection: "row",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "48%",
    minWidth: "47%",
    maxWidth: "48%",
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  reviewButton: {
    backgroundColor: "#64B5F6",
  },
  rateButton: {
    backgroundColor: "#F59E0B",
  },
  studyButton: {
    backgroundColor: "#66BB6A",
  },
  addButton: {
    backgroundColor: "#64B5F6",
  },
  addToAccountButton: {
    backgroundColor: "#8B5CF6",
  },
  updateButton: {
    backgroundColor: "#0EA5E9",
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  addToAccountButtonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    flexShrink: 1,
  },
  cardsListContainer: {
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
    justifyContent: "space-between",
    rowGap: CARD_GRID_GUTTER,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  emptyCardsText: {
    textAlign: "center",
    opacity: 0.7,
    width: "100%",
  },
  cardItem: {
    position: "relative",
    paddingVertical: 12,
    paddingRight: 10,
    paddingLeft: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "column",
    alignItems: "stretch",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#4255ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardItemInner: {
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
  },
  cardItemAlt: {
    backgroundColor: "#fafbff",
    shadowColor: "#1f2937",
    shadowOpacity: 0.05,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#4255ff",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    opacity: 0.85,
  },
  cardMedia: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f3f4f6",
  },
  cardMediaCompact: {
    height: 72,
  },
  cardFront: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  cardFrontCompact: {
    fontSize: 15,
    marginBottom: 6,
  },
  cardBack: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 6,
    lineHeight: 22,
  },
  cardBackCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardNotes: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
    lineHeight: 18,
  },
  cardContent: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingLeft: 4,
    paddingRight: 4,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
    alignSelf: "flex-end",
    marginTop: 10,
    paddingTop: 4,
  },
  cardActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardEditButton: {
    backgroundColor: "rgba(66, 85, 255, 0.08)",
    borderColor: "rgba(66, 85, 255, 0.2)",
  },
  cardDeleteButton: {
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderColor: "rgba(220, 38, 38, 0.2)",
  },
});
