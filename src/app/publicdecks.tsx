import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Deck } from "@/assets/data/decks";
import ListOfDecks from "@/src/components/ListOfDecks";
import { useAuth } from "@/src/contexts/AuthContext";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { supabase } from "@/src/lib/supabase";

export default function PublicDecksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    if (!user?.id) {
      setDecks([]);
      setCardCounts({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: decksData, error: decksError } = await supabase
      .from("decks")
      .select("*")
      .eq("is_public", true)
      .neq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (decksError) {
      setError(t("failedToLoadData"));
      setDecks([]);
      setLoading(false);
      return;
    }

    const deckList = (decksData ?? []) as Deck[];
    setDecks(deckList);

    if (deckList.length === 0) {
      setCardCounts({});
      setLoading(false);
      return;
    }

    const deckIds = deckList.map((d) => d.deck_id);
    const { data: cardsData } = await supabase
      .from("cards")
      .select("deck_id")
      .in("deck_id", deckIds);

    const counts: Record<string, number> = {};
    (cardsData ?? []).forEach((c) => {
      const did = c.deck_id as string;
      counts[did] = (counts[did] ?? 0) + 1;
    });
    setCardCounts(counts);
    setLoading(false);
  }, [user?.id, t]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  useFocusEffect(
    useCallback(() => {
      loadDecks();
    }, [loadDecks])
  );

  const handlePressDeck = (deck: Deck) => {
    router.push(`/deck-detail?id=${deck.deck_id}`);
  };

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t("publicDecks"),
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

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4255ff" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : decks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="globe" size={48} color="#c7d2fe" />
          </View>
          <Text style={styles.emptyTitle}>{t("noPublicDecks")}</Text>
          <Text style={styles.emptySubtitle}>{t("noPublicDecksHint")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("publicDecks")}</Text>
            <Text style={styles.sectionCount}>
              {decks.length} {decks.length !== 1 ? t("decks") : t("deck")}
            </Text>
          </View>
          <ListOfDecks
            decks={decks}
            cardCounts={cardCounts}
            onPressDeck={handlePressDeck}
            readOnly
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
  },
  sectionCount: {
    fontSize: 14,
    color: "#9ca3af",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(66, 85, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
  },
});
