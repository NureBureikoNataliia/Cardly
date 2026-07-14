import {
  getCardSearchableText,
  matchesCardFilter,
  sortDeckCards,
  fetchProgressMapForCardIds,
  queryDeckCards,
  hasActiveDeckCardQuery,
} from '../deckCardListQuery';
import { supabase } from '@/src/lib/supabase';
import type { Card } from '@/assets/data/cards';
import type { UserCardProgress } from '../userCardProgress';

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('deckCardListQuery', () => {
  const mockCard: Card = {
    card_id: 'card1',
    deck_id: 'deck1',
    front_text: 'Apple',
    back_text: 'Яблуко',
    notes: 'red fruit',
    card_type: 'standard',
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-01T12:00:00Z',
  } as unknown as Card;

  const mockCards: Card[] = [
    {
      card_id: 'card1',
      deck_id: 'deck1',
      front_text: 'Apple',
      back_text: 'Яблуко',
      notes: 'red fruit',
      card_type: 'standard',
      created_at: '2026-06-01T12:00:00Z',
      updated_at: '2026-06-01T12:00:00Z',
    },
    {
      card_id: 'card2',
      deck_id: 'deck1',
      front_text: 'Banana',
      back_text: 'Банан',
      notes: 'yellow fruit',
      card_type: 'cloze',
      created_at: '2026-06-02T12:00:00Z',
      updated_at: '2026-06-02T12:00:00Z',
    },
    {
      card_id: 'card3',
      deck_id: 'deck1',
      front_text: 'Cherry',
      back_text: 'Вишня',
      notes: '',
      card_type: 'reversible',
      created_at: '2026-06-03T12:00:00Z',
      updated_at: '2026-06-04T12:00:00Z',
    },
  ] as unknown as Card[];

  const progressMap = new Map<string, UserCardProgress>([
    ['card1', { card_id: 'card1', status: 'new', due_date: null } as UserCardProgress],
    ['card2', { card_id: 'card2', status: 'review', due_date: '2026-06-22T10:00:00Z' } as UserCardProgress],
  ]);

  describe('getCardSearchableText', () => {
    it('returns combined text lowercased', () => {
      const text = getCardSearchableText(mockCards[0]);
      expect(text).toBe('apple яблуко red fruit');
    });
  });

  describe('matchesCardFilter', () => {
    it('returns true for "all"', () => {
      expect(matchesCardFilter(mockCards[0], 'all', progressMap, 3)).toBe(true);
    });

    it('correctly filters standard cards (not cloze)', () => {
      expect(matchesCardFilter(mockCards[0], 'standard', progressMap, 3)).toBe(true);
      expect(matchesCardFilter(mockCards[1], 'standard', progressMap, 3)).toBe(false);
    });

    it('correctly filters cloze cards', () => {
      expect(matchesCardFilter(mockCards[0], 'cloze', progressMap, 3)).toBe(false);
      expect(matchesCardFilter(mockCards[1], 'cloze', progressMap, 3)).toBe(true);
    });

    it('correctly filters new cards', () => {
      expect(matchesCardFilter(mockCards[0], 'new', progressMap, 3)).toBe(true);
      expect(matchesCardFilter(mockCards[2], 'new', progressMap, 3)).toBe(true); // not in progressMap = new
      expect(matchesCardFilter(mockCards[1], 'new', progressMap, 3)).toBe(false);
    });

    it('correctly filters due today cards', () => {
      const now = new Date('2026-06-22T12:00:00Z');
      expect(matchesCardFilter(mockCards[0], 'dueToday', progressMap, 3, now)).toBe(true); // new is due
      expect(matchesCardFilter(mockCards[1], 'dueToday', progressMap, 3, now)).toBe(true); // due_date matches end of day
    });
  });

  describe('sortDeckCards', () => {
    it('sorts cards by newest creation date by default', () => {
      const sorted = sortDeckCards(mockCards, 'newest');
      expect(sorted[0].card_id).toBe('card3');
      expect(sorted[1].card_id).toBe('card2');
      expect(sorted[2].card_id).toBe('card1');
    });

    it('sorts cards by oldest creation date', () => {
      const sorted = sortDeckCards(mockCards, 'oldest');
      expect(sorted[0].card_id).toBe('card1');
      expect(sorted[2].card_id).toBe('card3');
    });

    it('sorts cards by front text alphabetically ascending', () => {
      const sorted = sortDeckCards(mockCards, 'frontAsc');
      expect(sorted[0].front_text).toBe('Apple');
      expect(sorted[1].front_text).toBe('Banana');
      expect(sorted[2].front_text).toBe('Cherry');
    });

    it('sorts cards by front text alphabetically descending', () => {
      const sorted = sortDeckCards(mockCards, 'frontDesc');
      expect(sorted[0].front_text).toBe('Cherry');
      expect(sorted[1].front_text).toBe('Banana');
      expect(sorted[2].front_text).toBe('Apple');
    });
  });

  describe('fetchProgressMapForCardIds', () => {
    it('returns empty map if no ids', async () => {
      const map = await fetchProgressMapForCardIds('user1', []);
      expect(map.size).toBe(0);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('fetches and maps progress', async () => {
      const mockIn = jest.fn().mockResolvedValue({ data: [{ card_id: 'c1', status: 'learning' }] });
      const mockEq = jest.fn().mockReturnValue({ in: mockIn });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const map = await fetchProgressMapForCardIds('user1', ['c1']);
      expect(map.get('c1')).toEqual({ card_id: 'c1', status: 'learning' });
    });
  });

  describe('queryDeckCards', () => {
    it('performs search, filter, and sort combined', () => {
      const options = {
        search: 'fruit',
        filter: 'standard' as const,
        sort: 'newest' as const,
        progressMap,
        srsDayStartHour: 3,
        now: new Date('2026-06-22T12:00:00Z'),
      };
      const result = queryDeckCards(mockCards, options);
      expect(result.length).toBe(1);
      expect(result[0].card_id).toBe('card1');
    });
  });

  describe('hasActiveDeckCardQuery', () => {
    it('returns true if any query parameter is active', () => {
      expect(hasActiveDeckCardQuery('apple', 'all', 'newest')).toBe(true);
      expect(hasActiveDeckCardQuery('', 'cloze', 'newest')).toBe(true);
      expect(hasActiveDeckCardQuery('', 'all', 'oldest')).toBe(true);
      expect(hasActiveDeckCardQuery('', 'all', 'newest')).toBe(false);
    });
  });
});
