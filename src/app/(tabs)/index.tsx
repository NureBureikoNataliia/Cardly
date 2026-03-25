import 'react-native-url-polyfill/auto';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

import { Deck } from '@/assets/data/decks';
import { supabase } from '@/src/lib/supabase';
import ConfirmModal from '@/src/components/ConfirmModal';
import ListOfDecks from '@/src/components/ListOfDecks';
import { Text, View } from '@/src/components/Themed';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';

export default function MainScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setDecks([]);
      setCardCounts({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [{ data: decksData, error: decksError }, { data: cardsData }] = await Promise.all([
      supabase
        .from('decks')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('cards').select('deck_id'),
    ]);

    if (decksError) {
      setError('Failed to load decks');
    } else if (decksData) {
      setDecks(decksData as Deck[]);
    }

    const counts: Record<string, number> = {};
    if (cardsData) {
      for (const c of cardsData) {
        const did = c.deck_id as string;
        counts[did] = (counts[did] ?? 0) + 1;
      }
    }
    setCardCounts(counts);
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

  const handleEditDeck = (deck: Deck) => {
    router.push(`/add-deck?deckId=${deck.deck_id}`);
  };

  const handleDeleteDeck = (deck: Deck) => {
    setDeckToDelete(deck);
  };

  const performDeleteDeck = async () => {
    if (!deckToDelete) return;
    setDeckToDelete(null);
    await supabase.from('cards').delete().eq('deck_id', deckToDelete.deck_id);
    const { error } = await supabase.from('decks').delete().eq('deck_id', deckToDelete.deck_id);
    if (error) {
      setErrorModal(error.message || 'Failed to delete deck.');
    } else {
      loadDecks();
    }
  };

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
            <Feather name="layers" size={48} color="#c7d2fe" />
          </View>
          <Text style={styles.emptyTitle}>{t('noDecksYet')}</Text>
          <Text style={styles.emptySubtitle}>{t('createFirstDeck')}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/add-deck')}
            accessibilityRole="button"
          >
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>{t('createDeck')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentWrapper}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('yourDecks')}</Text>
            <Text style={styles.sectionCount}>{decks.length} {decks.length !== 1 ? t('decks') : t('deck')}</Text>
          </View>
          <ListOfDecks
            decks={decks}
            cardCounts={cardCounts}
            onPressDeck={handlePressDeck}
            onEditDeck={handleEditDeck}
            onDeleteDeck={handleDeleteDeck}
          />
        </View>
      )}

      {decks.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-deck')}
          accessibilityRole="button"
          accessibilityLabel={t('addDeck')}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <ConfirmModal
        visible={Boolean(deckToDelete)}
        title="Delete deck"
        message="Are you sure you want to delete this deck? All cards in it will be deleted."
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        icon="trash-2"
        onConfirm={performDeleteDeck}
        onCancel={() => setDeckToDelete(null)}
      />

      <ConfirmModal
        visible={Boolean(errorModal)}
        title={t('error')}
        message={errorModal ?? ''}
        confirmText={t('ok')}
        cancelText={null}
        onConfirm={() => setErrorModal(null)}
        onCancel={() => setErrorModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  sectionCount: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(66, 85, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4255ff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4255ff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#4255ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
