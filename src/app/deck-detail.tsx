import { Deck } from "@/assets/data/decks";
import { Card } from "@/assets/data/cards";
import { Text, View } from "@/src/components/Themed";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import ConfirmModal from "@/src/components/ConfirmModal";
import { LanguageDropdown } from "@/src/components/LanguageDropdown";
import { useLanguage } from "@/src/contexts/LanguageContext";

const scrollPositions: Record<string, number> = {};

export default function DeckDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const deckId = typeof params.id === "string" ? params.id : null;
  const { t } = useLanguage();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
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
    }

    setLoading(false);
  }, [deckId, t]);

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

  // For now, we'll show a portion of cards as "due for review today"
  // In a real app, this would be based on spaced repetition scheduling
  const dueToday = Math.ceil(totalCards * 0.3);

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
      headerShown: true,
      title: t("appName"),
      headerStyle: { backgroundColor: "#fff" },
      headerShadowVisible: true,
      headerTintColor: "#1f2937",
      headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ marginLeft: 8, padding: 4 }}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </Pressable>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginRight: 8 }}>
          <LanguageDropdown />
          <Link href="/modal" asChild>
            <Pressable>
              {({ pressed }) => (
                <FontAwesome
                  name="info-circle"
                  size={25}
                  color="#1f2937"
                  style={{ opacity: pressed ? 0.5 : 1 }}
                />
              )}
            </Pressable>
          </Link>
        </View>
      ),
      tabBarStyle: { display: "none" },
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
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t("dueToday")}</Text>
          <Text style={styles.statNumber}>{dueToday}</Text>
        </View>
        <View style={[styles.divider]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel]}>
            {t("totalCards")}
          </Text>
          <Text style={styles.statNumber}>{totalCards}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.repeatButton]}
          onPress={() => setShowCards((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={t("reviewCards")}
        >
          <Feather size={24} color="#fff" />
          <Text style={styles.buttonText}>{t("reviewCards")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={() => router.push(`/add-card?deckId=${deck.deck_id}`)}
          accessibilityRole="button"
          accessibilityLabel={t("addCard")}
        >
          <Feather name="plus" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t("addCard")}</Text>
        </TouchableOpacity>
      </View>

      {showCards && (
        <View style={styles.cardsListContainer}>
          {cards.length === 0 ? (
            <Text style={styles.emptyCardsText}>{t("noCardsInDeck")}</Text>
          ) : (
            cards.map((card, index) => (
              <View key={card.card_id} style={[styles.cardItem, index % 2 === 0 && styles.cardItemAlt]}>
                <View style={styles.cardAccent} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardFront}>{card.front_text}</Text>
                  <Text style={styles.cardBack}>{card.back_text}</Text>
                  {card.notes ? <Text style={styles.cardNotes}>{card.notes}</Text> : null}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.cardActionButton, styles.cardEditButton]}
                    onPress={() => handleEditCard(card)}
                    accessibilityRole="button"
                    accessibilityLabel={t("editCard")}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={18} color="#4255ff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardActionButton, styles.cardDeleteButton]}
                    onPress={() => handleDeleteCard(card)}
                    accessibilityRole="button"
                    accessibilityLabel={t("deleteCard")}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}
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
    backgroundColor: "#f3f4f6",
  },
  contentContainer: {
    alignItems: "center",
    paddingBottom: 24,
  },
  deckImage: {
    width: "100%",
    height: 200,
  },
  deckImageWrapper: {
    width: "100%",
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
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: "80%",
    maxWidth: 280,
    backgroundColor: "transparent",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  divider: {
    height: 1,
    marginVertical: 8,
    backgroundColor: "#ccc",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
     backgroundColor: "transparent",
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
     backgroundColor: "transparent",
  },
  buttonContainer: {
    gap: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  button: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  repeatButton: {
    backgroundColor: "#66BB6A",
  },
  addButton: {
    backgroundColor: "#64B5F6",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  cardsListContainer: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 14,
  },
  emptyCardsText: {
    textAlign: "center",
    opacity: 0.7,
  },
  cardItem: {
    position: "relative",
    padding: 18,
    paddingLeft: 22,
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#4255ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
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
  cardFront: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  cardBack: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 6,
    lineHeight: 22,
  },
  cardNotes: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
    lineHeight: 18,
  },
  cardContent: {
    flex: 1,
    paddingRight: 12,
    paddingLeft: 4,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  cardActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
