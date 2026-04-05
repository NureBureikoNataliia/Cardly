import { Card } from "@/assets/data/cards";
import { Text, View } from "@/src/components/Themed";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useLanguage } from "@/src/contexts/LanguageContext";

export default function DeckReviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const deckId = typeof params.id === "string" ? params.id : null;
  const { t } = useLanguage();

  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    if (!deckId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCards(data as Card[]);
      setCurrentIndex(0);
      setShowBack(false);
    }
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("reviewCards"),
    });
  }, [navigation, t]);

  const currentCard = cards[currentIndex];
  const total = cards.length;
  const cardCounterText = t("cardXOfY")
    .replace("{current}", String(currentIndex + 1))
    .replace("{total}", String(total));

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setShowBack(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setShowBack(false);
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

  if (cards.length === 0) {
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

      <View style={styles.navButtons}>
        <TouchableOpacity
          style={[styles.navButton, styles.prevButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
          <Text style={styles.navButtonText}>{t("previousCard")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, currentIndex >= total - 1 && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={currentIndex >= total - 1}
        >
          <Text style={styles.navButtonText}>{t("nextCard")}</Text>
          <Feather name="chevron-right" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
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
    borderLeftColor: "#64B5F6",
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
  navButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
    width: "100%",
    justifyContent: "center",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  prevButton: {
    backgroundColor: "#64B5F6",
  },
  nextButton: {
    backgroundColor: "#66BB6A",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
