import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";


import { Deck } from "@/assets/data/decks";
import ListOfDecks from "@/src/components/ListOfDecks";
import { useAuth } from "@/src/contexts/AuthContext";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { supabase } from "@/src/lib/supabase";

type SortKey = "newest" | "oldest" | "title" | "cards";

export default function PublicDecksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [ratingByDeckId, setRatingByDeckId] = useState<Record<string, number>>({});
  const [ratingCountByDeckId, setRatingCountByDeckId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const loadDecks = useCallback(async () => {
    if (!user?.id) {
      setDecks([]);
      setCardCounts({});
      setRatingByDeckId({});
      setRatingCountByDeckId({});
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
      setRatingByDeckId({});
      setRatingCountByDeckId({});
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

    const { data: ratingsData, error: ratingsError } = await supabase
      .from("pack_ratings")
      .select("deck_id, rating")
      .in("deck_id", deckIds);

    if (!ratingsError && ratingsData) {
      const sumByDeck: Record<string, number> = {};
      const countByDeck: Record<string, number> = {};

      for (const r of ratingsData) {
        const did = r.deck_id as string;
        const rating = r.rating as number;
        sumByDeck[did] = (sumByDeck[did] ?? 0) + rating;
        countByDeck[did] = (countByDeck[did] ?? 0) + 1;
      }

      const avgByDeck: Record<string, number> = {};
      for (const did of Object.keys(countByDeck)) {
        avgByDeck[did] = sumByDeck[did] / countByDeck[did];
      }

      setRatingByDeckId(avgByDeck);
      setRatingCountByDeckId(countByDeck);
    } else {
      setRatingByDeckId({});
      setRatingCountByDeckId({});
    }
    setLoading(false);
  }, [user?.id, t]);

  useEffect(() => { loadDecks(); }, [loadDecks]);
  useFocusEffect(useCallback(() => { loadDecks(); }, [loadDecks]));

  const handlePressDeck = (deck: Deck) => {
    router.push(`/deck-detail?id=${deck.deck_id}`);
  };

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("publicDecks"),
    });
  }, [navigation, t]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...decks]
      .filter((deck) => {
        if (!q) return true;
        return (
          (deck.title ?? "").toLowerCase().includes(q) ||
          (deck.description ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "oldest")
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === "title")
          return (a.title ?? "").localeCompare(b.title ?? "", undefined, { sensitivity: "base" });
        if (sortBy === "cards")
          return (cardCounts[b.deck_id] ?? 0) - (cardCounts[a.deck_id] ?? 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [decks, searchQuery, sortBy, cardCounts]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: t("newest") },
    { key: "oldest", label: t("oldest") },
    { key: "title",  label: t("title")  },
    { key: "cards",  label: t("cards")  },
  ];

  const listHeader = (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("publicDecks")}</Text>
        <Text style={styles.sectionCount}>
          {filtered.length} {filtered.length !== 1 ? t("decks") : t("deck")}
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        {/* search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("searchDecks")}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x-circle" size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* sort */}
        <View style={styles.controlBlock}>
          <Text style={styles.chipsLabel}>{t("sortBy")}</Text>
          <View style={styles.chipsRow}>
            {sortOptions.map(({ key, label }) => (
              <Pressable
                key={key}
                style={[styles.chip, sortBy === key && styles.chipActive]}
                onPress={() => setSortBy(key)}
              >
                <Text style={[styles.chipText, sortBy === key && styles.chipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </>
  );

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
        <ListOfDecks
          decks={filtered}
          cardCounts={cardCounts}
          ratingByDeckId={ratingByDeckId}
          ratingCountByDeckId={ratingCountByDeckId}
          onPressDeck={handlePressDeck}
          readOnly
          listHeaderComponent={listHeader}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
  },
  contentWrapper: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    flex: 1,
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

  /* header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  sectionCount: {
    fontSize: 13,
    color: "#9ca3af",
  },

  /* controls */
  controlsContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  searchContainer: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 0,
  },
  controlBlock: {
    gap: 6,
  },
  chipsLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 10,
    minWidth: 54,
    alignItems: "center",
  },
  chipActive: {
    borderColor: "#4255ff",
    backgroundColor: "rgba(66, 85, 255, 0.12)",
  },
  chipText: {
    fontSize: 13,
    color: "#4b5563",
  },
  chipTextActive: {
    color: "#4255ff",
    fontWeight: "600",
  },

  /* empty */
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
