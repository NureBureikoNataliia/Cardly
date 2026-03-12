export interface Card {
  card_id: string;   // UUID from DB
  deck_id: string;   // UUID (decks.deck_id)
  card_type: string | null;
  front_text: string;
  back_text: string;
  front_media_url: string | null;
  back_media_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Spaced repetition (Anki/SM-2)
  next_review_at?: string | null;
  interval_days?: number;
  ease_factor?: number;
  repetitions?: number;
  last_reviewed_at?: string | null;
}

// Початково масив порожній – картки приходять з бекенду / створюються користувачем
export const cards: Card[] = [];