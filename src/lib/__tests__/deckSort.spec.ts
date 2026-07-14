import { Deck } from '@/assets/data/decks';
import { compareDeckTitles, queryDecks, DeckQueryOptions } from '../deckSort';

describe('deckSort', () => {
  describe('compareDeckTitles', () => {
    it('properly collates Ukrainian letters', () => {
      const d1 = { title: 'Євген' } as Deck;
      const d2 = { title: 'Алекс' } as Deck;
      const d3 = { title: 'Іван' } as Deck;
      const d4 = { title: 'Яків' } as Deck;

      // "Алекс", "Євген", "Іван", "Яків"
      expect(compareDeckTitles(d1, d2)).toBeGreaterThan(0); // Євген > Алекс
      expect(compareDeckTitles(d1, d3)).toBeLessThan(0);    // Євген < Іван
      expect(compareDeckTitles(d3, d4)).toBeLessThan(0);    // Іван < Яків

      const list = [d1, d2, d3, d4];
      list.sort(compareDeckTitles);
      expect(list.map((d) => d.title)).toEqual(['Алекс', 'Євген', 'Іван', 'Яків']);
    });
  });

  describe('queryDecks', () => {
    const mockDecks: Deck[] = [
      {
        deck_id: 'deck-1',
        title: 'Англійська мова',
        description: 'Базова лексика',
        is_public: true,
        created_at: '2026-01-01T12:00:00.000Z',
      } as Deck,
      {
        deck_id: 'deck-2',
        title: 'Німецька мова',
        description: 'Граматика',
        is_public: false,
        created_at: '2026-01-02T12:00:00.000Z',
      } as Deck,
      {
        deck_id: 'deck-3',
        title: 'Іспанська розмовна',
        description: 'Діалоги',
        is_public: true,
        created_at: '2026-01-03T12:00:00.000Z',
      } as Deck,
    ];

    const defaultOptions: DeckQueryOptions = {
      searchQuery: '',
      visibilityFilter: 'all',
      sortBy: 'newest',
      cardCounts: {},
      ratingByDeckId: {},
      ratingCountByDeckId: {},
    };

    it('returns all decks by default sorted by newest', () => {
      const result = queryDecks(mockDecks, defaultOptions);
      expect(result.map(d => d.deck_id)).toEqual(['deck-3', 'deck-2', 'deck-1']);
    });

    it('filters by public visibility', () => {
      const result = queryDecks(mockDecks, {
        ...defaultOptions,
        visibilityFilter: 'public',
      });
      expect(result.map(d => d.deck_id)).toEqual(['deck-3', 'deck-1']);
    });

    it('filters by private visibility', () => {
      const result = queryDecks(mockDecks, {
        ...defaultOptions,
        visibilityFilter: 'private',
      });
      expect(result.map(d => d.deck_id)).toEqual(['deck-2']);
    });

    it('searches by title case-insensitive', () => {
      const result = queryDecks(mockDecks, {
        ...defaultOptions,
        searchQuery: ' німецька ',
      });
      expect(result.map(d => d.deck_id)).toEqual(['deck-2']);
    });

    it('searches by description case-insensitive', () => {
      const result = queryDecks(mockDecks, {
        ...defaultOptions,
        searchQuery: 'лексика',
      });
      expect(result.map(d => d.deck_id)).toEqual(['deck-1']);
    });

    it('sorts by oldest', () => {
      const result = queryDecks(mockDecks, {
        ...defaultOptions,
        sortBy: 'oldest',
      });
      expect(result.map(d => d.deck_id)).toEqual(['deck-1', 'deck-2', 'deck-3']);
    });

    it('sorts by titleAsc and titleDesc using Ukrainian collation', () => {
      const asc = queryDecks(mockDecks, {
        ...defaultOptions,
        sortBy: 'titleAsc',
      });
      expect(asc.map(d => d.title)).toEqual(['Англійська мова', 'Іспанська розмовна', 'Німецька мова']);

      const desc = queryDecks(mockDecks, {
        ...defaultOptions,
        sortBy: 'titleDesc',
      });
      expect(desc.map(d => d.title)).toEqual(['Німецька мова', 'Іспанська розмовна', 'Англійська мова']);
    });

    it('sorts by ratingDesc and ratingAsc', () => {
      const ratingByDeckId = {
        'deck-1': 4.5,
        'deck-2': 5.0,
        'deck-3': 3.0,
      };
      const ratingCountByDeckId = {
        'deck-1': 10,
        'deck-2': 1,
        'deck-3': 5,
      };

      const desc = queryDecks(mockDecks, {
        ...defaultOptions,
        sortBy: 'ratingDesc',
        ratingByDeckId,
        ratingCountByDeckId,
      });
      expect(desc.map(d => d.deck_id)).toEqual(['deck-2', 'deck-1', 'deck-3']);

      const asc = queryDecks(mockDecks, {
        ...defaultOptions,
        sortBy: 'ratingAsc',
        ratingByDeckId,
        ratingCountByDeckId,
      });
      expect(asc.map(d => d.deck_id)).toEqual(['deck-3', 'deck-1', 'deck-2']);
    });

    it('sorts by card counts', () => {
      const cardCounts = {
        'deck-1': 5,
        'deck-2': 25,
        'deck-3': 12,
      };

      const result = queryDecks(mockDecks, {
        ...defaultOptions,
        sortBy: 'cards',
        cardCounts,
      });
      expect(result.map(d => d.deck_id)).toEqual(['deck-2', 'deck-3', 'deck-1']);
    });
  });
});
