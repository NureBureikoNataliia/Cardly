import { cards } from "@/assets/data/cards";
import { decks as defaultDecks } from "@/assets/data/decks";
import { Text, View } from "@/src/components/Themed";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useLayoutEffect } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
} from "react-native";

export default function DeckDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const deckId = typeof params.id === "string" ? parseInt(params.id, 10) : null;

  const deck = deckId ? defaultDecks.find((d) => d.deck_id === deckId) : null;

  // Count total cards in deck
  const totalCards = deckId
    ? cards.filter((c) => c.deck_id === deckId).length
    : 0;

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

  if (!deck) {
    return (
      <View style={styles.container}>
        <Text style={styles.deckTitle}>Deck not found</Text>
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
          onPress={() => console.log("Review cards")}
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
});
