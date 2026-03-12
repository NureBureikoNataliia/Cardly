import { Card } from "@/assets/data/cards";
import { Text, View } from "@/src/components/Themed";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { type Rating } from "@/src/lib/spacedRepetition";
import {
  fetchUserProgressForDeck,
  isCardDueForUser,
  saveProgressAfterRating,
} from "@/src/lib/userCardProgress";
import { useStudySettings } from "@/src/contexts/StudySettingsContext";

export default function DeckStudyScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const deckId = typeof params.id === "string" ? params.id : null;
  const { t } = useLanguage();
  const { user } = useAuth();
  const { settings: studySettings } = useStudySettings();

  const [cards, setCards] = useState<Card[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, import("@/src/lib/userCardProgress").UserCardProgress>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const loadCards = useCallback(async () => {
    if (!deckId || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: cardsData, error: cardsError } = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false });

    if (cardsError || !cardsData) {
      setLoading(false);
      return;
    }

    const allCards = cardsData as Card[];
    const cardIds = allCards.map((c) => c.card_id);
    const progress = await fetchUserProgressForDeck(user.id, cardIds);
    setProgressMap(progress);

    const dueCards = allCards.filter((c) => isCardDueForUser(progress.get(c.card_id)));
    setCards(dueCards);
    setCurrentIndex(0);
    setShowBack(false);
    setSessionComplete(false);
    setLoading(false);
  }, [deckId, user?.id]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t("studying"),
      headerStyle: { backgroundColor: "#fff" },
      headerShadowVisible: true,
      headerTintColor: "#1f2937",
      headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ marginLeft: 8, padding: 4 }}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </Pressable>
      ),
      tabBarStyle: { display: "none" },
    });
  }, [navigation, router, t]);

  const currentCard = cards[currentIndex];
  const total = cards.length;
  const cardCounterText = t("cardXOfY")
    .replace("{current}", String(currentIndex + 1))
    .replace("{total}", String(total));

  const handleRate = async (rating: Rating) => {
    if (!currentCard || saving || !user?.id) return;

    setSaving(true);
    const currentProgress = progressMap.get(currentCard.card_id);
    const { error } = await saveProgressAfterRating(
      user.id,
      currentCard.card_id,
      rating,
      currentProgress,
      studySettings
    );
    setSaving(false);

    if (error) return;

    if (rating === 1) {
      const rest = cards.filter((_, i) => i !== currentIndex);
      setCards([...rest, currentCard]);
      setShowBack(false);
      if (rest.length > 0) {
        setCurrentIndex(0);
      }
    } else {
      const rest = cards.filter((_, i) => i !== currentIndex);
      setCards(rest);
      setCurrentIndex(0);
      setShowBack(false);
      if (rest.length === 0) setSessionComplete(true);
    }
  };

  const handleCardPress = () => {
    setShowBack((prev) => !prev);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t("loadingDeck")}</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t("mustBeLoggedIn")}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t("goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cards.length === 0 && !sessionComplete) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t("noCardsToReview")}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>{t("goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sessionComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.completeCard}>
          <Feather name="check-circle" size={64} color="#66BB6A" />
          <Text style={styles.completeTitle}>{t("reviewComplete")}</Text>
        </View>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>{t("goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>{cardCounterText}</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={handleCardPress}
        activeOpacity={1}
      >
        <View style={styles.cardInner}>
          <Text style={styles.cardTitle}>
            {showBack ? currentCard.back_text : currentCard.front_text}
          </Text>
          {showBack && currentCard.notes ? (
            <Text style={styles.cardNotes}>{currentCard.notes}</Text>
          ) : null}
          {!showBack && (
            <Text style={styles.hint}>{t("showAnswer")}</Text>
          )}
        </View>
      </TouchableOpacity>

      {showBack ? (
        <View style={styles.ratingButtons}>
          <TouchableOpacity
            style={[styles.ratingBtn, styles.againBtn]}
            onPress={() => handleRate(1)}
            disabled={saving}
          >
            <Text style={styles.ratingBtnText}>{t("again")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ratingBtn, styles.hardBtn]}
            onPress={() => handleRate(2)}
            disabled={saving}
          >
            <Text style={styles.ratingBtnText}>{t("hard")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ratingBtn, styles.goodBtn]}
            onPress={() => handleRate(3)}
            disabled={saving}
          >
            <Text style={styles.ratingBtnText}>{t("good")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ratingBtn, styles.easyBtn]}
            onPress={() => handleRate(4)}
            disabled={saving}
          >
            <Text style={styles.ratingBtnText}>{t("easy")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.ratingHint}>{t("showAnswer")}</Text>
      )}

      {saving && (
        <ActivityIndicator size="small" color="#4255ff" style={styles.loader} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 18,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#4255ff",
    borderRadius: 12,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  completeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
  },
  counter: {
    position: "absolute",
    top: 80,
    fontSize: 14,
    opacity: 0.7,
  },
  card: {
    width: "100%",
    minHeight: 200,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderLeftWidth: 6,
    borderLeftColor: "#66BB6A",
  },
  cardInner: {
    alignItems: "center",
    width: "100%",
  },
  cardMedia: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  cardNotes: {
    fontSize: 15,
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  hint: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 16,
  },
  ratingHint: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 24,
  },
  ratingButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 28,
    width: "100%",
    justifyContent: "center",
  },
  ratingBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    minWidth: 72,
    alignItems: "center",
  },
  againBtn: {
    backgroundColor: "#ef4444",
  },
  hardBtn: {
    backgroundColor: "#f59e0b",
  },
  goodBtn: {
    backgroundColor: "#22c55e",
  },
  easyBtn: {
    backgroundColor: "#3b82f6",
  },
  ratingBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  loader: {
    marginTop: 16,
  },
});
