import { Deck } from '@/assets/data/decks';

/** Ukrainian collation for deck titles (UA letters and mixed Latin/UA). */
export function compareDeckTitles(a: Deck, b: Deck): number {
  return (a.title ?? '').localeCompare(b.title ?? '', 'uk', { sensitivity: 'base' });
}

export type DeckListFilter = 'all' | 'public' | 'private';

export type DeckListSort =
  | 'newest'
  | 'oldest'
  | 'titleAsc'
  | 'titleDesc'
  | 'ratingAsc'
  | 'ratingDesc'
  | 'cards';

export interface DeckQueryOptions {
  searchQuery: string;
  visibilityFilter: DeckListFilter;
  sortBy: DeckListSort;
  cardCounts: Record<string, number>;
  ratingByDeckId: Record<string, number>;
  ratingCountByDeckId: Record<string, number>;
}

export function queryDecks(decks: Deck[], options: DeckQueryOptions): Deck[] {
  const normalizedQuery = options.searchQuery.trim().toLowerCase();

  return [...decks]
    .filter((deck) => {
      if (options.visibilityFilter === 'public' && !deck.is_public) return false;
      if (options.visibilityFilter === 'private' && deck.is_public) return false;

      if (!normalizedQuery) return true;

      const title = (deck.title ?? '').toLowerCase();
      const description = (deck.description ?? '').toLowerCase();
      return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (options.sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (options.sortBy === 'titleAsc') {
        return compareDeckTitles(a, b);
      }
      if (options.sortBy === 'titleDesc') {
        return compareDeckTitles(b, a);
      }
      if (options.sortBy === 'ratingDesc' || options.sortBy === 'ratingAsc') {
        const countA = options.ratingCountByDeckId[a.deck_id] ?? 0;
        const countB = options.ratingCountByDeckId[b.deck_id] ?? 0;
        const avgA = countA > 0 ? (options.ratingByDeckId[a.deck_id] ?? 0) : null;
        const avgB = countB > 0 ? (options.ratingByDeckId[b.deck_id] ?? 0) : null;
        if (avgA === null && avgB === null) {
          return compareDeckTitles(a, b);
        }
        if (avgA === null) return 1;
        if (avgB === null) return -1;
        const diff = options.sortBy === 'ratingDesc' ? avgB - avgA : avgA - avgB;
        if (diff !== 0) {
          return diff > 0 ? 1 : -1;
        }
        return compareDeckTitles(a, b);
      }
      if (options.sortBy === 'cards') {
        return (options.cardCounts[b.deck_id] ?? 0) - (options.cardCounts[a.deck_id] ?? 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

