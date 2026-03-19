import 'react-native-url-polyfill/auto';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, TouchableOpacity, View as RNView } from 'react-native';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'cards'>('newest');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');

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

  const filteredAndSortedDecks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...decks]
      .filter((deck) => {
        if (visibilityFilter === 'public' && !deck.is_public) return false;
        if (visibilityFilter === 'private' && deck.is_public) return false;

        if (!normalizedQuery) return true;

        const title = (deck.title ?? '').toLowerCase();
        const description = (deck.description ?? '').toLowerCase();
        return title.includes(normalizedQuery) || description.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'title') {
          return (a.title ?? '').localeCompare(b.title ?? '', undefined, { sensitivity: 'base' });
        }
        if (sortBy === 'cards') {
          return (cardCounts[b.deck_id] ?? 0) - (cardCounts[a.deck_id] ?? 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [decks, searchQuery, sortBy, visibilityFilter, cardCounts]);

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
        <ListOfDecks
          decks={filteredAndSortedDecks}
          cardCounts={cardCounts}
          onPressDeck={handlePressDeck}
          onEditDeck={handleEditDeck}
          onDeleteDeck={handleDeleteDeck}
          listHeaderComponent={
            <>
              <RNView style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('yourDecks')}</Text>
                <Text style={styles.sectionCount}>
                  {filteredAndSortedDecks.length} {filteredAndSortedDecks.length !== 1 ? t('decks') : t('deck')}
                </Text>
              </RNView>
              <RNView style={styles.controlsContainer}>
                <RNView style={styles.searchContainer}>
                  <Feather name="search" size={16} color="#9ca3af" />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('searchDecks')}
                    placeholderTextColor="#9ca3af"
                  />
                  {searchQuery.length > 0 ? (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                      <Feather name="x-circle" size={16} color="#9ca3af" />
                    </Pressable>
                  ) : null}
                </RNView>

                <RNView style={styles.controlBlock}>
                  <Text style={styles.chipsLabel}>{t('sortBy')}</Text>
                  <RNView style={styles.chipsRow}>
                    <Pressable
                      style={[styles.chip, sortBy === 'newest' && styles.chipActive]}
                      onPress={() => setSortBy('newest')}
                    >
                      <Text style={[styles.chipText, sortBy === 'newest' && styles.chipTextActive]}>
                        {t('newest')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chip, sortBy === 'oldest' && styles.chipActive]}
                      onPress={() => setSortBy('oldest')}
                    >
                      <Text style={[styles.chipText, sortBy === 'oldest' && styles.chipTextActive]}>
                        {t('oldest')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chip, sortBy === 'title' && styles.chipActive]}
                      onPress={() => setSortBy('title')}
                    >
                      <Text style={[styles.chipText, sortBy === 'title' && styles.chipTextActive]}>{t('title')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chip, sortBy === 'cards' && styles.chipActive]}
                      onPress={() => setSortBy('cards')}
                    >
                      <Text style={[styles.chipText, sortBy === 'cards' && styles.chipTextActive]}>{t('cards')}</Text>
                    </Pressable>
                  </RNView>
                </RNView>

                <RNView style={styles.controlBlock}>
                  <Text style={styles.chipsLabel}>{t('filterBy')}</Text>
                  <RNView style={styles.chipsRow}>
                    <Pressable
                      style={[styles.chip, visibilityFilter === 'all' && styles.chipActive]}
                      onPress={() => setVisibilityFilter('all')}
                    >
                      <Text style={[styles.chipText, visibilityFilter === 'all' && styles.chipTextActive]}>
                        {t('all')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chip, visibilityFilter === 'public' && styles.chipActive]}
                      onPress={() => setVisibilityFilter('public')}
                    >
                      <Text style={[styles.chipText, visibilityFilter === 'public' && styles.chipTextActive]}>
                        {t('public')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chip, visibilityFilter === 'private' && styles.chipActive]}
                      onPress={() => setVisibilityFilter('private')}
                    >
                      <Text style={[styles.chipText, visibilityFilter === 'private' && styles.chipTextActive]}>
                        {t('private')}
                      </Text>
                    </Pressable>
                  </RNView>
                </RNView>
              </RNView>
            </>
          }
        />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  sectionCount: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'right',
  },
  controlsContainer: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 10,
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 10,
  },
  searchContainer: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  controlBlock: {
    gap: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipsLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    minWidth: 54,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: '#4255ff',
    backgroundColor: 'rgba(66, 85, 255, 0.12)',
  },
  chipText: {
    fontSize: 13,
    color: '#4b5563',
  },
  chipTextActive: {
    color: '#4255ff',
    fontWeight: '600',
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
