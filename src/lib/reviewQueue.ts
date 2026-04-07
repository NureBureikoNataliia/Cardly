import type { Card } from "@/assets/data/cards";
import type { UserCardProgressRow } from "@cardly/srs/dbTypes";
import { supabase } from "@/src/lib/supabase";

export interface DueCard {
  progress: UserCardProgressRow;
  card: Card;
}

/** Synthetic row before first server-side review (Edge Function inserts the real row). */
export function syntheticNewProgress(userId: string, cardId: string): UserCardProgressRow {
  return {
    user_id: userId,
    card_id: cardId,
    status: "new",
    due_date: null,
    interval_days: 0,
    ease_factor: 2.5,
    repetitions: 0,
    last_reviewed_at: null,
    learning_step_index: 0,
  };
}

function isDue(progress: UserCardProgressRow, nowMs: number): boolean {
  if (progress.due_date == null) return true;
  const t = new Date(progress.due_date).getTime();
  if (Number.isNaN(t)) return true;
  return t <= nowMs;
}

/** Cards in the deck that are due now (including new / null due_date). */
export async function loadDueCardsForDeck(deckId: string): Promise<DueCard[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return [];

  const { data: cardsData, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true });

  if (cardsError || !cardsData?.length) return [];

  const cards = cardsData as Card[];
  const cardIds = cards.map((c) => c.card_id);

  const { data: progressData, error: progressError } = await supabase
    .from("user_card_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("card_id", cardIds);

  if (progressError) return [];

  const byCardId = new Map(
    (progressData as UserCardProgressRow[]).map((p) => [p.card_id, p]),
  );

  const now = Date.now();
  const due: DueCard[] = [];

  for (const card of cards) {
    const p = byCardId.get(card.card_id);
    if (!p) {
      due.push({ progress: syntheticNewProgress(user.id, card.card_id), card });
      continue;
    }
    if (isDue(p, now)) {
      due.push({ progress: p, card });
    }
  }

  return due;
}

export async function getDueCountForDeck(deckId: string): Promise<number> {
  const due = await loadDueCardsForDeck(deckId);
  return due.length;
}
