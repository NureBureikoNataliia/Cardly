import type { Card } from "@/assets/data/cards";
import {
    getNextSrsDayBoundary,
    normalizeSrsDayStartHour,
    SRS_DAY_START_HOUR_LOCAL,
} from "@/src/lib/srsDayBoundary";
import { supabase } from "@/src/lib/supabase";
import type { UserCardProgressRow } from "@cardly/srs/dbTypes";

export interface DueCard {
  progress: UserCardProgressRow;
  card: Card;
}

/** Synthetic row before first server-side review (Edge Function inserts the real row). */
export function syntheticNewProgress(
  userId: string,
  cardId: string,
): UserCardProgressRow {
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

/** Due before the next SRS day boundary (local “today” window), including later today — learn ahead. */
function isDueWithinTodaySrsWindow(
  progress: UserCardProgressRow,
  nowMs: number,
  startHour: number,
): boolean {
  if (progress.due_date == null) return true;
  const t = new Date(progress.due_date).getTime();
  if (Number.isNaN(t)) return true;
  const boundary = getNextSrsDayBoundary(new Date(nowMs), startHour).getTime();
  return t <= boundary;
}

function sortDueCardsForTodaySession(
  items: DueCard[],
  nowMs: number,
): DueCard[] {
  const keyed = items.map((dc) => {
    const d = dc.progress.due_date;
    const dueMs = d == null ? -1 : new Date(d).getTime();
    const isNew = d == null || Number.isNaN(dueMs);
    const effectiveDue = isNew ? -1 : dueMs;
    const overdue = !isNew && effectiveDue <= nowMs;
    return { dc, effectiveDue, overdue, isNew };
  });
  keyed.sort((a, b) => {
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    if (a.overdue && !b.overdue) return -1;
    if (!a.overdue && b.overdue) return 1;
    return a.effectiveDue - b.effectiveDue;
  });
  return keyed.map((k) => k.dc);
}

export type LoadDueCardsOptions = {
  /** Include cards due later today (before next SRS boundary) so the user does not wait for short delays. */
  includeScheduledToday?: boolean;
  /** Local hour (0–23) for SRS day boundary; defaults to app default if omitted. */
  srsDayStartHour?: number;
};

/** Cards in the deck that are due now, or (optionally) everything due before the next SRS day boundary. */
export async function loadDueCardsForDeck(
  deckId: string,
  options?: LoadDueCardsOptions,
): Promise<DueCard[]> {
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
  const includeToday = options?.includeScheduledToday === true;
  const startHour = normalizeSrsDayStartHour(
    options?.srsDayStartHour ?? SRS_DAY_START_HOUR_LOCAL,
  );
  const match = includeToday
    ? (p: UserCardProgressRow, ms: number) =>
        isDueWithinTodaySrsWindow(p, ms, startHour)
    : isDue;
  const due: DueCard[] = [];

  for (const card of cards) {
    const p = byCardId.get(card.card_id);
    if (!p) {
      due.push({ progress: syntheticNewProgress(user.id, card.card_id), card });
      continue;
    }
    if (match(p, now)) {
      due.push({ progress: p, card });
    }
  }

  return includeToday ? sortDueCardsForTodaySession(due, now) : due;
}

export async function getDueCountForDeck(deckId: string): Promise<number> {
  const due = await loadDueCardsForDeck(deckId);
  return due.length;
}
