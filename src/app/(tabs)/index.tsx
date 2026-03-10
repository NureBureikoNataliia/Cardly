import 'react-native-url-polyfill/auto';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

import { Deck } from '@/assets/data/decks';
import { supabase } from '@/src/lib/supabase';
import ListOfDecks from '@/src/components/ListOfDecks';
import { Text, View } from '@/src/components/Themed';
import { useAuth } from '@/src/contexts/AuthContext';

export default function MainScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setDecks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load decks');
    } else if (data) {
      setDecks(data as Deck[]);
    }

    setLoading(false);
  }, [user, authLoading]);

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

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text>{error}</Text>
        </View>
      ) : decks.length === 0 ? (
        <View style={styles.center}>
          <Text>No decks yet</Text>
        </View>
      ) : (
        <ListOfDecks decks={decks} onPressDeck={handlePressDeck} />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-deck')}
        accessibilityRole="button"
        accessibilityLabel="Add deck"
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2fdc38ff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
  },
});
