export interface Deck {
  deck_id: string;       // UUID from DB
  creator_id: string;    // UUID (users.user_id)
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  original_deck_id: string | null;
  config_id: string | null;
  created_at: string;
  updated_at: string;
}

// Початково масив порожній – колоди приходять з бекенду / створюються користувачем
export const decks: Deck[] = [];