import { Deck } from "@/assets/data/decks";
import { Card } from "@/assets/data/cards";
import { Text, View } from "@/src/components/Themed";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
} from "react-native";
import { supabase } from "@/src/lib/supabase";

export default function DeckDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const deckId = typeof params.id === "string" ? params.id : null;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    if (!deckId) {
      setError("Deck not found");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
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
            .order("created_at", { ascending: true }),
        ]);

      if (!isMounted) return;

      if (deckError || cardsError) {
        setError("Failed to load deck");
      } else {
        setDeck(deckData as Deck);
        const list = (cardsData as Card[]) ?? [];
        setCards(list);
        setTotalCards(list.length);
      }

      setLoading(false);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [deckId, params.id]);

  // For now, we'll show a portion of cards as "due for review today"
  // In a real app, this would be based on spaced repetition scheduling
  const dueToday = Math.ceil(totalCards * 0.3);


  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: "none" },
    });

    return () => {
      navigation.setOptions({
        headerShown: undefined,
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.deckTitle}>Loading deck...</Text>
      </View>
    );
  }

  if (error || !deck) {
    return (
      <View style={styles.container}>
        <Text style={styles.deckTitle}>{error ?? "Deck not found"}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {deck.cover_image_url && (
        <Image
          source={{ uri: deck.cover_image_url }}
          style={styles.deckImage}
          resizeMode="cover"
        />
      )}

      <Text style={[styles.deckTitle, !deck.cover_image_url && styles.deckTitleNoImage]}>
        {deck.title}
      </Text>

      {deck.description && (
        <Text style={styles.description}>{deck.description}</Text>
      )}

      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Due today</Text>
          <Text style={styles.statNumber}>{dueToday}</Text>
        </View>
        <View style={[styles.divider]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel]}>
            Total cards
          </Text>
          <Text style={styles.statNumber}>{totalCards}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.repeatButton]}
          onPress={() => setShowCards((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Review cards"
        >
          <Feather size={24} color="#fff" />
          <Text style={styles.buttonText}>Review Cards</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={() => router.push(`/add-card?deckId=${deck.deck_id}`)}
          accessibilityRole="button"
          accessibilityLabel="Add card"
        >
          <Feather name="plus" size={24} color="#fff" />
          <Text style={styles.buttonText}>Add Card</Text>
        </TouchableOpacity>
      </View>

      {showCards && (
        <View style={styles.cardsListContainer}>
          {cards.length === 0 ? (
            <Text style={styles.emptyCardsText}>No cards in this deck yet.</Text>
          ) : (
            cards.map((card) => (
              <View key={card.card_id} style={styles.cardItem}>
                <Text style={styles.cardFront}>{card.front_text}</Text>
                <Text style={styles.cardBack}>{card.back_text}</Text>
                {card.notes ? <Text style={styles.cardNotes}>{card.notes}</Text> : null}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: "center",
    paddingBottom: 24,
  },
  deckImage: {
    width: "100%",
    height: 200,
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
    paddingTop: 16,
    paddingBottom: 24,
    gap: 8,
  },
  emptyCardsText: {
    textAlign: "center",
    opacity: 0.7,
  },
  cardItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardFront: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardBack: {
    fontSize: 15,
    marginBottom: 4,
  },
  cardNotes: {
    fontSize: 13,
    color: "#6b7280",
  },
});
