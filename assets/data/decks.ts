export interface Deck {
  deck_id: number;
  creator_id: number;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  original_deck_id: number | null;
  config_id: number | null;
  created_at: string;
  updated_at: string;
}

export const decks: Deck[] = [
  {
    deck_id: 1,
    creator_id: 1,
    title: "Spanish Vocabulary - Basics",
    description: "Essential Spanish words and phrases for beginners",
    cover_image_url: "https://images.unsplash.com/photo-1543342384-1f1350e27861?w=400",
    is_public: true,
    original_deck_id: null,
    config_id: 1,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-20T14:22:00Z"
  },
  {
    deck_id: 2,
    creator_id: 3,
    title: "JavaScript Interview Questions",
    description: "Common questions asked in JavaScript technical interviews",
    cover_image_url: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
    is_public: true,
    original_deck_id: null,
    config_id: 2,
    created_at: "2024-01-10T09:15:00Z",
    updated_at: "2024-01-25T16:45:00Z"
  },
  {
    deck_id: 3,
    creator_id: 7,
    title: "World Capitals",
    description: "Learn the capital cities of countries around the world",
    cover_image_url: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400",
    is_public: true,
    original_deck_id: null,
    config_id: 3,
    created_at: "2023-12-05T11:00:00Z",
    updated_at: "2024-01-18T10:30:00Z"
  },
  {
    deck_id: 4,
    creator_id: 8,
    title: "Biology - Cell Structure",
    description: "Parts of the cell and their functions",
    cover_image_url: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400",
    is_public: true,
    original_deck_id: null,
    config_id: 4,
    created_at: "2024-01-22T13:20:00Z",
    updated_at: "2024-01-23T09:10:00Z"
  },
  {
    deck_id: 5,
    creator_id: 6,
    title: "Music Theory Fundamentals",
    description: "Basic concepts in music theory including scales, chords, and notation",
    cover_image_url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400",
    is_public: true,
    original_deck_id: null,
    config_id: 5,
    created_at: "2024-01-08T15:45:00Z",
    updated_at: "2024-01-19T11:30:00Z"
  },
  {
    deck_id: 6,
    creator_id: 4,
    title: "Medical Terminology",
    description: "Common medical prefixes, suffixes, and root words",
    cover_image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
    is_public: true,
    original_deck_id: null,
    config_id: 6,
    created_at: "2023-11-30T08:00:00Z",
    updated_at: "2024-01-21T14:15:00Z"
  },
  {
    deck_id: 7,
    creator_id: 5,
    title: "French Verbs - Present Tense",
    description: "Conjugation of common French verbs in present tense",
    cover_image_url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
    is_public: true,
    original_deck_id: null,
    config_id: 7,
    created_at: "2024-01-12T10:00:00Z",
    updated_at: "2024-01-24T13:40:00Z"
  },
  {
    deck_id: 8,
    creator_id: 7,
    title: "American History Timeline",
    description: "Key events and dates in United States history",
    cover_image_url: null,
    is_public: true,
    original_deck_id: null,
    config_id: 8,
    created_at: "2024-01-05T12:30:00Z",
    updated_at: "2024-01-22T15:20:00Z"
  },
  {
    deck_id: 9,
    creator_id: 2,
    title: "Spanish Vocabulary - Advanced",
    description: "Advanced Spanish vocabulary based on the basics deck",
    cover_image_url: "https://images.unsplash.com/photo-1543342384-1f1350e27861?w=400",
    is_public: false,
    original_deck_id: 1,
    config_id: 1,
    created_at: "2024-01-20T11:00:00Z",
    updated_at: "2024-01-26T09:30:00Z"
  },
  {
    deck_id: 10,
    creator_id: 1,
    title: "German Basics",
    description: "My personal German learning deck",
    cover_image_url: null,
    is_public: false,
    original_deck_id: null,
    config_id: 2,
    created_at: "2024-01-23T14:15:00Z",
    updated_at: "2024-01-27T10:45:00Z"
  }
];