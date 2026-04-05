/**
 * User card progress - integrates with user_card_progress table
 * Used for spaced repetition (Studying) - per-user progress
 */

import { supabase } from "@/src/lib/supabase";
import { scheduleCard, type Rating, type StudySettings } from "./spacedRepetition";

export interface UserCardProgress {
  user_id: string;
  card_id: string;
  status: string;
  due_date: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  last_reviewed_at: string;
}

/**
 * Fetch user's progress for cards in a deck
 */
export async function fetchUserProgressForDeck(
  userId: string,
  cardIds: string[]
): Promise<Map<string, UserCardProgress>> {
  if (cardIds.length === 0) return new Map();
  const { data } = await supabase
    .from("user_card_progress")
    .select("*")
    .eq("user_id", userId)
    .in("card_id", cardIds);
  const map = new Map<string, UserCardProgress>();
  (data ?? []).forEach((r) => map.set(r.card_id, r as UserCardProgress));
  return map;
}

/**
 * Card is due if no progress or due_date <= now
 */
export function isCardDueForUser(
  progress: UserCardProgress | undefined,
  now: Date = new Date()
): boolean {
  if (!progress) return true;
  return new Date(progress.due_date) <= now;
}

/**
 * Count cards due today for a user (no progress or due_date <= end of today)
 */
export function getDueTodayCountForUser(
  cardIds: string[],
  progressMap: Map<string, UserCardProgress>
): number {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return cardIds.filter((cardId) => {
    const p = progressMap.get(cardId);
    if (!p) return true;
    return new Date(p.due_date) <= endOfToday;
  }).length;
}

/**
 * Save progress after user rates a card (UPSERT into user_card_progress)
 */
export async function saveProgressAfterRating(
  userId: string,
  cardId: string,
  rating: Rating,
  currentProgress: UserCardProgress | undefined,
  settings?: StudySettings
): Promise<{ error: unknown }> {
  const current = currentProgress
    ? {
        next_review_at: currentProgress.due_date,
        interval_days: currentProgress.interval_days,
        ease_factor: currentProgress.ease_factor,
        repetitions: currentProgress.repetitions,
      }
    : undefined;

  const scheduled = scheduleCard(current, rating, new Date(), settings);

  const row = {
    user_id: userId,
    card_id: cardId,
    status: rating === 1 ? "relearning" : "review",
    due_date: scheduled.next_review_at,
    interval_days: Math.max(0, Math.round(scheduled.interval_days)),
    ease_factor: scheduled.ease_factor,
    repetitions: scheduled.repetitions,
    last_reviewed_at: scheduled.last_reviewed_at,
  };

  const { error } = await supabase
    .from("user_card_progress")
    .upsert(row, { onConflict: "user_id,card_id" });

  return { error };
}
